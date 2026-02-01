// ==================== Bid Tracker Module ====================
// Tracks bids and generates ICS files for Outlook calendar integration

const BidTracker = {
    // State
    bids: [],
    editingBidId: null,
    filterStatus: 'all',
    extractedData: null,

    // Initialize the bid tracker
    init() {
        this.loadBids();
        this.bindEvents();
        this.render();
        this.initPdfJs();
    },

    // Initialize PDF.js
    initPdfJs() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    },

    // Load bids from localStorage
    loadBids() {
        try {
            const saved = localStorage.getItem('bidTrackerData');
            if (saved) {
                this.bids = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading bids:', e);
            this.bids = [];
        }
    },

    // Save bids to localStorage
    saveBids() {
        try {
            localStorage.setItem('bidTrackerData', JSON.stringify(this.bids));
        } catch (e) {
            console.error('Error saving bids:', e);
        }
    },

    // Bind all event listeners
    bindEvents() {
        // Tab switching for input forms
        document.querySelectorAll('.bid-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const inputType = e.target.dataset.input;
                this.switchInputTab(inputType);
            });
        });

        // Add bid button
        document.getElementById('addBidBtn')?.addEventListener('click', () => this.addBid());

        // Clear form button
        document.getElementById('clearBidFormBtn')?.addEventListener('click', () => this.clearForm());

        // Filter status
        document.getElementById('bidFilterStatus')?.addEventListener('change', (e) => {
            this.filterStatus = e.target.value;
            this.renderBidsTable();
        });

        // Modal events
        document.getElementById('closeBidModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBidEdit')?.addEventListener('click', () => this.closeModal());
        document.getElementById('saveBidEdit')?.addEventListener('click', () => this.saveEdit());
        document.getElementById('deleteBidBtn')?.addEventListener('click', () => this.deleteBid());

        // Enter key on form inputs
        document.querySelectorAll('#bidManualForm input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addBid();
            });
        });

        // File drop zone events
        this.bindFileDropEvents();
    },

    // Bind file drop zone events
    bindFileDropEvents() {
        const dropZone = document.getElementById('fileDropZone');
        const fileInput = document.getElementById('itbFileInput');
        const removeBtn = document.getElementById('removeFileBtn');
        const useExtractedBtn = document.getElementById('useExtractedBtn');
        const discardBtn = document.getElementById('discardExtractedBtn');

        if (!dropZone || !fileInput) return;

        // Click to open file browser
        dropZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });

        // Drag events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Remove file button
        removeBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.resetFileUpload();
        });

        // Use extracted data button
        useExtractedBtn?.addEventListener('click', () => this.useExtractedData());

        // Discard button
        discardBtn?.addEventListener('click', () => this.resetFileUpload());
    },

    // Handle uploaded file
    async handleFile(file) {
        // Validate file type
        if (file.type !== 'application/pdf') {
            this.showToast('Please upload a PDF file', 'error');
            return;
        }

        // Show file status
        const dropZone = document.getElementById('fileDropZone');
        const fileStatus = document.getElementById('fileStatus');
        const fileName = document.getElementById('fileName');
        const extractedPreview = document.getElementById('extractedPreview');

        dropZone.style.display = 'none';
        fileStatus.style.display = 'block';
        extractedPreview.style.display = 'none';
        fileName.textContent = file.name;

        // Extract text from PDF
        try {
            const text = await this.extractTextFromPDF(file);

            // Parse the extracted text
            this.extractedData = this.parseITBText(text);

            // Show preview
            this.showExtractedPreview();
        } catch (error) {
            console.error('Error extracting PDF:', error);
            this.showToast('Error reading PDF file. Please try again.', 'error');
            this.resetFileUpload();
        }
    },

    // Extract text from PDF using PDF.js
    async extractTextFromPDF(file) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    if (typeof pdfjsLib === 'undefined') {
                        throw new Error('PDF.js library not loaded');
                    }

                    progressText.textContent = 'Loading PDF...';
                    progressFill.style.width = '20%';

                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    const totalPages = pdf.numPages;
                    let fullText = '';

                    progressText.textContent = `Extracting text (0/${totalPages} pages)...`;
                    progressFill.style.width = '30%';

                    for (let i = 1; i <= totalPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';

                        const progress = 30 + (i / totalPages) * 60;
                        progressFill.style.width = `${progress}%`;
                        progressText.textContent = `Extracting text (${i}/${totalPages} pages)...`;
                    }

                    progressFill.style.width = '100%';
                    progressText.textContent = 'Analyzing content...';

                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    },

    // Show extracted data preview
    showExtractedPreview() {
        const fileStatus = document.getElementById('fileStatus');
        const extractedPreview = document.getElementById('extractedPreview');
        const previewGrid = document.getElementById('previewGrid');

        fileStatus.style.display = 'none';
        extractedPreview.style.display = 'block';

        const data = this.extractedData;
        const fields = [
            { key: 'projectName', label: 'Project Name', value: data.projectName },
            { key: 'bidNumber', label: 'Bid Number', value: data.bidNumber },
            { key: 'client', label: 'Client/Agency', value: data.client },
            { key: 'dueDate', label: 'Bid Due Date', value: data.dueDate ? this.formatDateTime(data.dueDate) : '' },
            { key: 'preBidDate', label: 'Pre-Bid Meeting', value: data.preBidDate ? this.formatDateTime(data.preBidDate) : '' },
            { key: 'rfiDate', label: 'RFI Due Date', value: data.rfiDate ? this.formatDateTime(data.rfiDate) : '' }
        ];

        previewGrid.innerHTML = fields.map(field => `
            <div class="preview-item ${!field.value ? 'empty' : ''}">
                <div class="preview-label">${field.label}</div>
                <div class="preview-value ${!field.value ? 'not-found' : ''}">${field.value || 'Not found'}</div>
            </div>
        `).join('');

        this.showToast('Document analyzed! Review the extracted data below.', 'success');
    },

    // Use extracted data - populate form and switch to manual tab
    useExtractedData() {
        if (!this.extractedData) return;

        const data = this.extractedData;

        // Populate form fields
        if (data.projectName) document.getElementById('bidProjectName').value = data.projectName;
        if (data.bidNumber) document.getElementById('bidNumber').value = data.bidNumber;
        if (data.client) document.getElementById('bidClient').value = data.client;
        if (data.dueDate) document.getElementById('bidDueDate').value = data.dueDate;
        if (data.preBidDate) document.getElementById('bidPreBidDate').value = data.preBidDate;
        if (data.rfiDate) document.getElementById('bidRfiDate').value = data.rfiDate;

        // Reset file upload UI
        this.resetFileUpload();

        // Switch to manual entry tab
        this.switchInputTab('manual');

        this.showToast('Data populated! Review and complete the form.', 'success');
    },

    // Reset file upload UI
    resetFileUpload() {
        const dropZone = document.getElementById('fileDropZone');
        const fileStatus = document.getElementById('fileStatus');
        const extractedPreview = document.getElementById('extractedPreview');
        const fileInput = document.getElementById('itbFileInput');
        const progressFill = document.getElementById('progressFill');

        dropZone.style.display = 'block';
        fileStatus.style.display = 'none';
        extractedPreview.style.display = 'none';
        fileInput.value = '';
        progressFill.style.width = '0%';
        this.extractedData = null;
    },

    // Switch between manual entry and ITB extraction tabs
    switchInputTab(inputType) {
        document.querySelectorAll('.bid-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.input === inputType);
        });
        document.querySelectorAll('.bid-input-form').forEach(form => {
            form.classList.toggle('active', form.id === (inputType === 'manual' ? 'bidManualForm' : 'bidExtractForm'));
        });
    },

    // Add a new bid
    addBid() {
        const projectName = document.getElementById('bidProjectName')?.value.trim();
        const client = document.getElementById('bidClient')?.value.trim();
        const dueDate = document.getElementById('bidDueDate')?.value;

        if (!projectName || !client || !dueDate) {
            this.showToast('Please fill in Project Name, Client, and Bid Due Date', 'error');
            return;
        }

        const bid = {
            id: Date.now(),
            projectName,
            bidNumber: document.getElementById('bidNumber')?.value.trim() || '',
            client,
            value: document.getElementById('bidValue')?.value.trim() || '',
            dueDate,
            preBidDate: document.getElementById('bidPreBidDate')?.value || '',
            rfiDate: document.getElementById('bidRfiDate')?.value || '',
            siteVisit: document.getElementById('bidSiteVisit')?.value || '',
            status: document.getElementById('bidStatus')?.value || 'researching',
            notes: document.getElementById('bidNotes')?.value.trim() || '',
            createdAt: new Date().toISOString()
        };

        this.bids.push(bid);
        this.saveBids();
        this.clearForm();
        this.render();
        this.showToast('Bid added successfully!', 'success');
    },

    // Clear the input form
    clearForm() {
        document.getElementById('bidProjectName').value = '';
        document.getElementById('bidNumber').value = '';
        document.getElementById('bidClient').value = '';
        document.getElementById('bidValue').value = '';
        document.getElementById('bidDueDate').value = '';
        document.getElementById('bidPreBidDate').value = '';
        document.getElementById('bidRfiDate').value = '';
        document.getElementById('bidSiteVisit').value = '';
        document.getElementById('bidStatus').value = 'researching';
        document.getElementById('bidNotes').value = '';
    },

    // Parse ITB text to extract relevant information
    parseITBText(text) {
        const result = {
            projectName: '',
            bidNumber: '',
            client: '',
            dueDate: '',
            preBidDate: '',
            rfiDate: ''
        };

        // Normalize text
        const normalizedText = text.replace(/\s+/g, ' ');

        // Extract project name patterns
        const projectPatterns = [
            /(?:project\s*(?:name|title)?|title|subject|re:|regarding)[:\s]+["']?([^"'\n]{10,100}?)["']?(?:\n|$|\.)/i,
            /(?:ITB|RFP|RFQ|BID|invitation\s+(?:to|for)\s+bid)[:\s#-]*(?:\d*[:\s]+)?["']?([^"'\n]{10,100}?)["']?(?:\n|$)/i,
            /(?:for\s+the\s+construction\s+of|project\s*:)[:\s]*([^,\n]{10,100})/i
        ];
        for (const pattern of projectPatterns) {
            const match = text.match(pattern);
            if (match && match[1].trim().length > 5) {
                result.projectName = match[1].trim().substring(0, 100);
                break;
            }
        }

        // Extract bid number
        const bidNumPatterns = [
            /(?:ITB|RFP|RFQ|BID|solicitation|contract|project)\s*(?:number|no\.?|#)?[:\s#-]*([A-Z]*\d{2,}[-\d\/A-Z]*)/i,
            /(?:number|no\.?|#)[:\s]*([A-Z]*\d{2,}[-\d\/A-Z]*)/i
        ];
        for (const pattern of bidNumPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.bidNumber = match[1].trim();
                break;
            }
        }

        // Extract client/agency
        const clientPatterns = [
            /(?:agency|owner|client|department|(?:city|county|state|town)\s+of)[:\s]+([A-Z][^,\n]{3,50})/i,
            /(?:issued\s+by|from|prepared\s+(?:by|for))[:\s]+([A-Z][^,\n]{3,50})/i,
            /(?:the\s+)?((?:city|county|state|town)\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
        ];
        for (const pattern of clientPatterns) {
            const match = text.match(pattern);
            if (match) {
                result.client = match[1].trim().substring(0, 100);
                break;
            }
        }

        // Date extraction helper
        const extractDateTime = (patterns) => {
            for (const pattern of patterns) {
                const match = normalizedText.match(pattern);
                if (match) {
                    return this.parseExtractedDate(match[0]);
                }
            }
            return '';
        };

        // Bid due date patterns
        const dueDatePatterns = [
            /(?:bid|proposal|response)s?\s+(?:due|deadline|must\s+be\s+(?:received|submitted))[:\s]+[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i,
            /(?:due\s+date|deadline|submit\s+by|submission\s+deadline)[:\s]+[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i,
            /(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?[^,\n]*(?:bid|proposal|due)/i,
            /(?:bids?\s+(?:will\s+be\s+)?(?:received|opened|due))[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i
        ];
        result.dueDate = extractDateTime(dueDatePatterns);

        // Pre-bid meeting patterns
        const preBidPatterns = [
            /(?:pre-?bid|mandatory)\s+(?:meeting|conference)[:\s]+[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i,
            /(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?[^,\n]*(?:pre-?bid)/i,
            /(?:pre-?bid|site\s+visit)[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i
        ];
        result.preBidDate = extractDateTime(preBidPatterns);

        // RFI/Questions due patterns
        const rfiPatterns = [
            /(?:questions?|RFI|inquir(?:y|ies))\s+(?:due|deadline|must\s+be\s+(?:received|submitted))[:\s]+[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?\b/i,
            /(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?))?[^,\n]*(?:question|RFI|inquir)/i,
            /(?:last\s+day\s+(?:for|to\s+submit)\s+questions?)[^,\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
        ];
        result.rfiDate = extractDateTime(rfiPatterns);

        return result;
    },

    // Parse extracted date string to datetime-local format
    parseExtractedDate(dateStr) {
        if (!dateStr) return '';

        try {
            // Clean the string
            let cleaned = dateStr.replace(/[^\d\/\-:\sAaPpMm,\w]/g, ' ').trim();

            // Try to extract date and time components
            let dateMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            let timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i);

            // Also try named month format
            if (!dateMatch) {
                const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];
                const namedMatch = cleaned.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
                if (namedMatch) {
                    const monthIdx = monthNames.findIndex(m => m.startsWith(namedMatch[1].toLowerCase()));
                    if (monthIdx !== -1) {
                        dateMatch = [null, namedMatch[2], String(monthIdx + 1), namedMatch[3]];
                    }
                }
            }

            if (!dateMatch) return '';

            let month = parseInt(dateMatch[1]);
            let day = parseInt(dateMatch[2]);
            let year = parseInt(dateMatch[3]);

            // Swap if it looks like day/month format
            if (month > 12 && day <= 12) {
                [month, day] = [day, month];
            }

            // Handle 2-digit year
            if (year < 100) {
                year += year < 50 ? 2000 : 1900;
            }

            // Format date
            const dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Format time
            let hour = 14; // Default to 2 PM
            let minute = 0;
            if (timeMatch) {
                hour = parseInt(timeMatch[1]);
                minute = parseInt(timeMatch[2]);
                const isPM = timeMatch[3]?.toLowerCase() === 'pm';
                const isAM = timeMatch[3]?.toLowerCase() === 'am';
                if (isPM && hour < 12) hour += 12;
                if (isAM && hour === 12) hour = 0;
            }

            return `${dateFormatted}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        } catch (e) {
            console.error('Error parsing date:', e);
            return '';
        }
    },

    // Render all components
    render() {
        this.renderBidsTable();
        this.renderDeadlines();
    },

    // Render the bids table
    renderBidsTable() {
        const tbody = document.getElementById('bidsTableBody');
        const emptyState = document.getElementById('emptyBidsState');
        const table = document.querySelector('.bids-table');

        if (!tbody) return;

        // Filter bids
        let filteredBids = this.bids;
        if (this.filterStatus !== 'all') {
            filteredBids = this.bids.filter(b => b.status === this.filterStatus);
        }

        // Sort by due date
        filteredBids.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        if (filteredBids.length === 0) {
            if (table) table.style.display = 'none';
            if (emptyState) emptyState.classList.add('visible');
            return;
        }

        if (table) table.style.display = 'table';
        if (emptyState) emptyState.classList.remove('visible');

        tbody.innerHTML = filteredBids.map(bid => {
            const dueDate = new Date(bid.dueDate);
            const now = new Date();
            const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            let dueDateClass = '';
            if (daysUntil < 0) dueDateClass = 'overdue';
            else if (daysUntil <= 3) dueDateClass = 'upcoming';

            return `
                <tr data-bid-id="${bid.id}">
                    <td>
                        <strong>${this.escapeHtml(bid.projectName)}</strong>
                        ${bid.bidNumber ? `<br><small style="color: var(--text-muted);">${this.escapeHtml(bid.bidNumber)}</small>` : ''}
                    </td>
                    <td>${this.escapeHtml(bid.client)}</td>
                    <td class="bid-date ${dueDateClass}">${this.formatDateTime(bid.dueDate)}</td>
                    <td class="bid-date">${bid.rfiDate ? this.formatDateTime(bid.rfiDate) : '-'}</td>
                    <td><span class="bid-status-badge ${bid.status}">${this.formatStatus(bid.status)}</span></td>
                    <td>
                        <div class="bid-actions">
                            <button class="bid-action-btn download-ics" onclick="BidTracker.downloadICS(${bid.id})" title="Download calendar events">
                                ICS
                            </button>
                            <button class="bid-action-btn" onclick="BidTracker.editBid(${bid.id})" title="Edit bid">
                                Edit
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Render upcoming deadlines
    renderDeadlines() {
        const container = document.getElementById('deadlinesTimeline');
        if (!container) return;

        // Collect all deadlines from active bids
        const deadlines = [];
        const now = new Date();

        // Only include bids that are not submitted/won/lost/no-bid
        const activeBids = this.bids.filter(b => ['researching', 'preparing'].includes(b.status));

        activeBids.forEach(bid => {
            // Bid Due Date
            if (bid.dueDate) {
                const dueDate = new Date(bid.dueDate);
                if (dueDate > now) {
                    deadlines.push({
                        date: dueDate,
                        type: 'bid-due',
                        title: 'BID DUE',
                        project: bid.projectName,
                        bidId: bid.id
                    });

                    // Internal: Finalize Bid Package - day before at 12 PM
                    const finalizeBid = new Date(dueDate);
                    finalizeBid.setDate(finalizeBid.getDate() - 1);
                    finalizeBid.setHours(12, 0, 0, 0);
                    if (finalizeBid > now) {
                        deadlines.push({
                            date: finalizeBid,
                            type: 'internal',
                            title: 'Finalize Bid Package & Checklist',
                            project: bid.projectName,
                            bidId: bid.id,
                            internal: true
                        });
                    }

                    // Internal: Secure Bid Bond - 3 days before at 9 AM
                    const bidBond = new Date(dueDate);
                    bidBond.setDate(bidBond.getDate() - 3);
                    bidBond.setHours(9, 0, 0, 0);
                    if (bidBond > now) {
                        deadlines.push({
                            date: bidBond,
                            type: 'internal',
                            title: 'Secure Bid Bond',
                            project: bid.projectName,
                            bidId: bid.id,
                            internal: true
                        });
                    }
                }
            }

            // Pre-Bid Meeting
            if (bid.preBidDate) {
                const preBid = new Date(bid.preBidDate);
                if (preBid > now) {
                    deadlines.push({
                        date: preBid,
                        type: 'pre-bid',
                        title: 'Pre-Bid Meeting',
                        project: bid.projectName,
                        bidId: bid.id
                    });
                }
            }

            // RFI Due
            if (bid.rfiDate) {
                const rfiDate = new Date(bid.rfiDate);
                if (rfiDate > now) {
                    deadlines.push({
                        date: rfiDate,
                        type: 'rfi-due',
                        title: 'RFI Due',
                        project: bid.projectName,
                        bidId: bid.id
                    });

                    // Internal: Finalize RFI - day before at 12 PM
                    const finalizeRfi = new Date(rfiDate);
                    finalizeRfi.setDate(finalizeRfi.getDate() - 1);
                    finalizeRfi.setHours(12, 0, 0, 0);
                    if (finalizeRfi > now) {
                        deadlines.push({
                            date: finalizeRfi,
                            type: 'internal',
                            title: 'Finalize RFI',
                            project: bid.projectName,
                            bidId: bid.id,
                            internal: true
                        });
                    }
                }
            }

            // Site Visit
            if (bid.siteVisit) {
                const siteVisit = new Date(bid.siteVisit);
                if (siteVisit > now) {
                    deadlines.push({
                        date: siteVisit,
                        type: 'site-visit',
                        title: 'Site Visit',
                        project: bid.projectName,
                        bidId: bid.id
                    });
                }
            }
        });

        // Sort by date
        deadlines.sort((a, b) => a.date - b.date);

        // Take next 10 deadlines
        const upcomingDeadlines = deadlines.slice(0, 10);

        if (upcomingDeadlines.length === 0) {
            container.innerHTML = '<div class="empty-deadlines">No upcoming deadlines</div>';
            return;
        }

        container.innerHTML = upcomingDeadlines.map(d => {
            const daysUntil = Math.ceil((d.date - now) / (1000 * 60 * 60 * 24));
            let itemClass = d.internal ? 'internal' : '';
            let countdownClass = '';

            if (daysUntil <= 1) {
                itemClass = 'urgent';
                countdownClass = 'urgent';
            } else if (daysUntil <= 3) {
                itemClass = 'warning';
                countdownClass = 'soon';
            }

            const countdownText = daysUntil === 0 ? 'TODAY' :
                daysUntil === 1 ? '1 day' :
                    `${daysUntil} days`;

            return `
                <div class="deadline-item ${itemClass}">
                    <div class="deadline-date">
                        <span class="day">${d.date.getDate()}</span>
                        <span class="month-year">${d.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
                        <span class="time">${d.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <div class="deadline-info">
                        <div class="deadline-title">${d.internal ? '* ' : ''}${this.escapeHtml(d.title)}</div>
                        <div class="deadline-project">${this.escapeHtml(d.project)}</div>
                    </div>
                    <div class="deadline-countdown ${countdownClass}">${countdownText}</div>
                </div>
            `;
        }).join('');
    },

    // Edit a bid
    editBid(bidId) {
        const bid = this.bids.find(b => b.id === bidId);
        if (!bid) return;

        this.editingBidId = bidId;

        document.getElementById('editBidProjectName').value = bid.projectName;
        document.getElementById('editBidNumber').value = bid.bidNumber || '';
        document.getElementById('editBidClient').value = bid.client;
        document.getElementById('editBidValue').value = bid.value || '';
        document.getElementById('editBidDueDate').value = bid.dueDate;
        document.getElementById('editBidPreBidDate').value = bid.preBidDate || '';
        document.getElementById('editBidRfiDate').value = bid.rfiDate || '';
        document.getElementById('editBidSiteVisit').value = bid.siteVisit || '';
        document.getElementById('editBidStatus').value = bid.status;
        document.getElementById('editBidNotes').value = bid.notes || '';

        document.getElementById('bidEditModal').classList.remove('hidden');
    },

    // Save edited bid
    saveEdit() {
        const bid = this.bids.find(b => b.id === this.editingBidId);
        if (!bid) return;

        const projectName = document.getElementById('editBidProjectName').value.trim();
        const client = document.getElementById('editBidClient').value.trim();
        const dueDate = document.getElementById('editBidDueDate').value;

        if (!projectName || !client || !dueDate) {
            this.showToast('Please fill in Project Name, Client, and Bid Due Date', 'error');
            return;
        }

        bid.projectName = projectName;
        bid.bidNumber = document.getElementById('editBidNumber').value.trim();
        bid.client = client;
        bid.value = document.getElementById('editBidValue').value.trim();
        bid.dueDate = dueDate;
        bid.preBidDate = document.getElementById('editBidPreBidDate').value;
        bid.rfiDate = document.getElementById('editBidRfiDate').value;
        bid.siteVisit = document.getElementById('editBidSiteVisit').value;
        bid.status = document.getElementById('editBidStatus').value;
        bid.notes = document.getElementById('editBidNotes').value.trim();

        this.saveBids();
        this.closeModal();
        this.render();
        this.showToast('Bid updated successfully!', 'success');
    },

    // Delete a bid
    deleteBid() {
        if (!confirm('Are you sure you want to delete this bid?')) return;

        this.bids = this.bids.filter(b => b.id !== this.editingBidId);
        this.saveBids();
        this.closeModal();
        this.render();
        this.showToast('Bid deleted', 'success');
    },

    // Close the edit modal
    closeModal() {
        document.getElementById('bidEditModal').classList.add('hidden');
        this.editingBidId = null;
    },

    // Download ICS file for a bid
    downloadICS(bidId) {
        const bid = this.bids.find(b => b.id === bidId);
        if (!bid) return;

        const events = this.generateEvents(bid);
        const icsContent = this.generateICSContent(events, bid.projectName);

        // Create and download file
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Bid_${bid.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        this.showToast(`ICS file downloaded with ${events.length} events`, 'success');
    },

    // Generate all events for a bid
    generateEvents(bid) {
        const events = [];

        // 1. Bid Due Date
        if (bid.dueDate) {
            const dueDate = new Date(bid.dueDate);
            events.push({
                uid: `bid-due-${bid.id}`,
                summary: `BID DUE: ${bid.projectName}`,
                description: this.buildDescription(bid, 'Bid submission deadline'),
                start: dueDate,
                end: new Date(dueDate.getTime() + 60 * 60 * 1000),
                alarms: [
                    { trigger: '-P1D' },
                    { trigger: '-PT1H' }
                ],
                priority: 1
            });

            // Internal: Finalize Bid Package - day before at 12 PM
            const finalizeBid = new Date(dueDate);
            finalizeBid.setDate(finalizeBid.getDate() - 1);
            finalizeBid.setHours(12, 0, 0, 0);
            events.push({
                uid: `finalize-bid-${bid.id}`,
                summary: `Finalize Bid Package & Checklist: ${bid.projectName}`,
                description: `INTERNAL REMINDER\n\nComplete final review of:\n- Bid documents\n- Qualification package\n- All required forms\n- Signatures\n\nProject: ${bid.projectName}\nClient: ${bid.client}`,
                start: finalizeBid,
                end: new Date(finalizeBid.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-PT1H' }],
                priority: 2
            });

            // Internal: Secure Bid Bond - 3 days before at 9 AM
            const bidBond = new Date(dueDate);
            bidBond.setDate(bidBond.getDate() - 3);
            bidBond.setHours(9, 0, 0, 0);
            events.push({
                uid: `bid-bond-${bid.id}`,
                summary: `Secure Bid Bond: ${bid.projectName}`,
                description: `INTERNAL REMINDER\n\nEnsure bid bond is secured for:\n\nProject: ${bid.projectName}\nClient: ${bid.client}\nEstimated Value: ${bid.value || 'TBD'}`,
                start: bidBond,
                end: new Date(bidBond.getTime() + 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });
        }

        // 2. Pre-Bid Meeting
        if (bid.preBidDate) {
            const preBidDate = new Date(bid.preBidDate);
            events.push({
                uid: `pre-bid-${bid.id}`,
                summary: `Pre-Bid Meeting: ${bid.projectName}`,
                description: this.buildDescription(bid, 'Pre-bid meeting/conference'),
                start: preBidDate,
                end: new Date(preBidDate.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });
        }

        // 3. RFI Due Date
        if (bid.rfiDate) {
            const rfiDate = new Date(bid.rfiDate);
            events.push({
                uid: `rfi-due-${bid.id}`,
                summary: `RFI Due: ${bid.projectName}`,
                description: this.buildDescription(bid, 'Questions/RFI submission deadline'),
                start: rfiDate,
                end: new Date(rfiDate.getTime() + 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 2
            });

            // Internal: Finalize RFI - day before at 12 PM
            const finalizeRfi = new Date(rfiDate);
            finalizeRfi.setDate(finalizeRfi.getDate() - 1);
            finalizeRfi.setHours(12, 0, 0, 0);
            events.push({
                uid: `finalize-rfi-${bid.id}`,
                summary: `Finalize RFI: ${bid.projectName}`,
                description: `INTERNAL REMINDER\n\nComplete and review all questions/RFI for submission.\n\nProject: ${bid.projectName}\nClient: ${bid.client}`,
                start: finalizeRfi,
                end: new Date(finalizeRfi.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-PT1H' }],
                priority: 2
            });
        }

        // 4. Site Visit
        if (bid.siteVisit) {
            const siteVisitDate = new Date(bid.siteVisit);
            events.push({
                uid: `site-visit-${bid.id}`,
                summary: `Site Visit: ${bid.projectName}`,
                description: this.buildDescription(bid, 'Project site visit'),
                start: siteVisitDate,
                end: new Date(siteVisitDate.getTime() + 2 * 60 * 60 * 1000),
                alarms: [{ trigger: '-P1D' }, { trigger: '-PT1H' }],
                priority: 3
            });
        }

        return events;
    },

    // Build event description
    buildDescription(bid, eventType) {
        let desc = `${eventType}\n\n`;
        desc += `Project: ${bid.projectName}\n`;
        if (bid.bidNumber) desc += `Bid #: ${bid.bidNumber}\n`;
        desc += `Client: ${bid.client}\n`;
        if (bid.value) desc += `Estimated Value: ${bid.value}\n`;
        if (bid.notes) desc += `\nNotes: ${bid.notes}\n`;

        desc += '\n--- Key Dates ---\n';
        if (bid.dueDate) desc += `Bid Due: ${this.formatDateTime(bid.dueDate)}\n`;
        if (bid.preBidDate) desc += `Pre-Bid Meeting: ${this.formatDateTime(bid.preBidDate)}\n`;
        if (bid.rfiDate) desc += `RFI Due: ${this.formatDateTime(bid.rfiDate)}\n`;
        if (bid.siteVisit) desc += `Site Visit: ${this.formatDateTime(bid.siteVisit)}\n`;

        return desc;
    },

    // Generate ICS file content
    generateICSContent(events, calendarName) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//High-Performance Planner//Bid Tracker//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Bids - ${this.escapeICS(calendarName)}`,
            'X-WR-TIMEZONE:America/Los_Angeles'
        ];

        lines.push(
            'BEGIN:VTIMEZONE',
            'TZID:America/Los_Angeles',
            'BEGIN:STANDARD',
            'DTSTART:19701101T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
            'TZOFFSETFROM:-0700',
            'TZOFFSETTO:-0800',
            'END:STANDARD',
            'BEGIN:DAYLIGHT',
            'DTSTART:19700308T020000',
            'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
            'TZOFFSETFROM:-0800',
            'TZOFFSETTO:-0700',
            'END:DAYLIGHT',
            'END:VTIMEZONE'
        );

        events.forEach(event => {
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${event.uid}@highperformanceplanner`);
            lines.push(`DTSTAMP:${this.formatICSDate(new Date())}`);
            lines.push(`DTSTART;TZID=America/Los_Angeles:${this.formatICSDate(event.start, true)}`);
            lines.push(`DTEND;TZID=America/Los_Angeles:${this.formatICSDate(event.end, true)}`);
            lines.push(`SUMMARY:${this.escapeICS(event.summary)}`);
            lines.push(`DESCRIPTION:${this.escapeICS(event.description)}`);
            lines.push(`PRIORITY:${event.priority || 5}`);
            lines.push('STATUS:CONFIRMED');

            event.alarms?.forEach(alarm => {
                lines.push('BEGIN:VALARM');
                lines.push('ACTION:DISPLAY');
                lines.push(`DESCRIPTION:${this.escapeICS(event.summary)}`);
                lines.push(`TRIGGER:${alarm.trigger}`);
                lines.push('END:VALARM');
            });

            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    },

    // Format date for ICS
    formatICSDate(date, local = false) {
        if (local) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    },

    // Escape text for ICS format
    escapeICS(text) {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '');
    },

    // Format date/time for display
    formatDateTime(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    // Format status for display
    formatStatus(status) {
        const statusMap = {
            'researching': 'Researching',
            'preparing': 'Preparing',
            'submitted': 'Submitted',
            'won': 'Won',
            'lost': 'Lost',
            'no-bid': 'No Bid'
        };
        return statusMap[status] || status;
    },

    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = `toast ${type}`;
            toast.classList.remove('hidden');

            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        BidTracker.init();
    }, 100);
});
