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
        // Sync existing bids to Calendar and Matrix
        setTimeout(() => this.syncToCalendarAndMatrix(), 500);
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

            // Try AI extraction first, fall back to regex
            if (typeof AIService !== 'undefined' && AIService.isConfigured()) {
                const progressText = document.getElementById('progressText');
                progressText.textContent = 'AI analyzing document...';

                try {
                    const aiResult = await AIService.extractBidFromPDF(text);
                    this.extractedData = {
                        projectName: aiResult.projectName || '',
                        bidNumber: aiResult.bidNumber || '',
                        client: aiResult.client || '',
                        estimatedValue: aiResult.estimatedValue || '',
                        dueDate: this.formatAiDate(aiResult.bidDueDate, aiResult.bidDueTime),
                        preBidDate: this.formatAiDate(aiResult.preBidMeeting, aiResult.preBidMeetingTime),
                        rfiDate: this.formatAiDate(aiResult.rfiDueDate),
                        siteVisitDate: this.formatAiDate(aiResult.siteVisitDate),
                        projectLocation: aiResult.projectLocation || '',
                        projectDescription: aiResult.projectDescription || '',
                        bondRequired: aiResult.bondRequired || false,
                        bondPercentage: aiResult.bondPercentage || '',
                        aiConfidence: aiResult.confidence || 'medium',
                        extractionMethod: 'ai'
                    };
                    this.showToast('AI extraction complete!', 'success');
                } catch (aiError) {
                    console.warn('AI extraction failed, using regex fallback:', aiError);
                    this.extractedData = this.parseITBText(text);
                    this.extractedData.extractionMethod = 'regex';
                    this.showToast('Using pattern matching (AI unavailable)', 'warning');
                }
            } else {
                // Fall back to regex extraction
                this.extractedData = this.parseITBText(text);
                this.extractedData.extractionMethod = 'regex';
            }

            // Show preview
            this.showExtractedPreview();
        } catch (error) {
            console.error('Error extracting PDF:', error);
            this.showToast('Error reading PDF file. Please try again.', 'error');
            this.resetFileUpload();
        }
    },

    // Format AI date response to datetime-local format
    formatAiDate(dateStr, timeStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';

            let formatted = date.toISOString().slice(0, 10);
            if (timeStr) {
                // Parse time like "14:00" or "2:00 PM"
                let time = timeStr;
                if (timeStr.toLowerCase().includes('pm') && !timeStr.startsWith('12')) {
                    const hourMatch = timeStr.match(/(\d+)/);
                    if (hourMatch) {
                        const hour = parseInt(hourMatch[1]) + 12;
                        time = `${hour}:${timeStr.match(/:(\d+)/)?.[1] || '00'}`;
                    }
                } else if (timeStr.toLowerCase().includes('am') && timeStr.startsWith('12')) {
                    time = `00:${timeStr.match(/:(\d+)/)?.[1] || '00'}`;
                }
                time = time.replace(/[^\d:]/g, '');
                if (time.match(/^\d+:\d+$/)) {
                    formatted += 'T' + time.padStart(5, '0');
                }
            }
            return formatted;
        } catch (e) {
            return '';
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
        this.syncToCalendarAndMatrix(); // Sync to Calendar & Matrix
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

        // Normalize text - preserve some structure
        const normalizedText = text.replace(/\s+/g, ' ').trim();
        const lines = text.split(/\n/).map(l => l.trim()).filter(l => l);

        // ==================== PROJECT NAME EXTRACTION ====================
        // Priority order: specific labeled fields first
        const projectPatterns = [
            // Maryland DNR format: "DNR Project Title: Project Name"
            /(?:DNR\s+)?Project\s+Title[:\s]+([A-Z][^$\n]{5,100})/i,
            // Standard format: "Project Name: Something"
            /Project\s*(?:Name|Title)[:\s]+([A-Z][^$\n]{5,100})/i,
            // "RE:" or "Subject:" format
            /(?:RE|Subject)[:\s]+([A-Z][^$\n]{10,100})/i,
            // ITB/RFP for format: "ITB for Project Name"
            /(?:ITB|RFP|RFQ|IFB)\s+(?:for|#|No\.?)?[:\s]+([A-Z][^$\n]{10,100})/i,
            // Construction of format
            /(?:for\s+the\s+)?(?:construction|renovation|repair|improvement)\s+of[:\s]+([A-Z][^$,\n]{10,100})/i
        ];

        for (const pattern of projectPatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                let name = match[1].trim();
                // Clean up: remove trailing location info if too long
                if (name.length > 80) {
                    const locMatch = name.match(/^(.{20,80}?)(?:\s+at\s+|\s+located\s+|\s+-\s+)/i);
                    if (locMatch) name = locMatch[1];
                }
                // Exclude common false positives
                if (!name.match(/^(classification|solicitation|this\s+|for\s+the\s+purpose)/i)) {
                    result.projectName = name.substring(0, 100);
                    break;
                }
            }
        }

        // ==================== BID NUMBER EXTRACTION ====================
        const bidNumPatterns = [
            // Solicitation #: BPM054684
            /Solicitation\s*[#:]\s*([A-Z0-9][-A-Z0-9]{4,20})/i,
            // ITB/RFP/RFQ #/No.: Number
            /(?:ITB|RFP|RFQ|IFB|BID)\s*(?:#|No\.?|Number)?[:\s]+([A-Z0-9][-A-Z0-9]{4,20})/i,
            // Contract/Project Number
            /(?:Contract|Project)\s*(?:#|No\.?|Number)?[:\s]+([A-Z0-9][-A-Z0-9\/]{4,25})/i,
            // Generic "Number:" or "#:"
            /(?:Bid\s+)?(?:#|Number|No\.)[:\s]+([A-Z0-9][-A-Z0-9]{4,20})/i
        ];

        for (const pattern of bidNumPatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                result.bidNumber = match[1].trim();
                break;
            }
        }

        // ==================== CLIENT/AGENCY EXTRACTION ====================
        const clientPatterns = [
            // DNR format - extract Maryland DNR
            /DNR\s+Project\s+(?:#|Title)/i,
            // "Owner:" or "Agency:" labeled
            /(?:Owner|Agency|Client)[:\s]+([A-Z][A-Za-z\s&]{3,50}?)(?:\s+\(|\s*$|\s+Project)/i,
            // Department of X
            /((?:Department|Dept\.?)\s+of\s+[A-Z][A-Za-z\s&]{3,40})/i,
            // City/County/State of X
            /((?:City|County|State|Town|Village)\s+of\s+[A-Z][A-Za-z\s]{3,30})/i,
            // X County/City (reverse format)
            /([A-Z][A-Za-z]+\s+(?:County|City|Township|Borough|District))/i,
            // School District
            /([A-Z][A-Za-z\s]+\s+(?:School\s+District|Public\s+Schools|ISD))/i,
            // University/College
            /((?:University|College)\s+of\s+[A-Z][A-Za-z\s]+)/i
        ];

        // Check for DNR specifically
        if (normalizedText.match(/DNR\s+Project/i)) {
            result.client = 'Maryland DNR';
        } else {
            for (const pattern of clientPatterns) {
                const match = normalizedText.match(pattern);
                if (match && match[1]) {
                    let client = match[1].trim();
                    // Exclude common false positives
                    if (!client.match(/^(of\s+|the\s+|for\s+|general\s+services)/i)) {
                        result.client = client.substring(0, 100);
                        break;
                    }
                }
            }
        }

        // ==================== BID DUE DATE EXTRACTION ====================
        // Look for specific bid due date patterns
        const dueDatePatterns = [
            // "Bid Due Date: Day, Month DD, YYYY at HH:MM PM"
            /Bid\s+Due\s+Date[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
            // "Bids due: Month DD, YYYY"
            /Bids?\s+(?:are\s+)?due[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Due Date: MM/DD/YYYY"
            /(?:Bid\s+)?Due\s+Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Proposals due by Month DD, YYYY"
            /(?:Bid|Proposal)s?\s+(?:must\s+be\s+)?(?:submitted|received|due)\s+(?:by|on)[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Deadline: Month DD, YYYY at HH:MM"
            /(?:Submission\s+)?Deadline[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i
        ];

        for (const pattern of dueDatePatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1] + (match[2] ? ' ' + match[2] : '');
                const parsed = this.parseExtractedDate(dateStr);
                if (parsed && this.isReasonableDate(parsed)) {
                    result.dueDate = parsed;
                    break;
                }
            }
        }

        // ==================== PRE-BID MEETING EXTRACTION ====================
        // Look specifically for pre-bid conference/meeting patterns
        const preBidPatterns = [
            // "Pre-Bid Conference will be held on Day, Month DD, YYYY, at HH:MM"
            /Pre-?Bid\s+(?:Conference|Meeting)\s+(?:will\s+be\s+held|is\s+scheduled)\s+(?:on|for)[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4}),?\s+(?:at|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
            // "Pre-Bid Meeting: Month DD, YYYY at HH:MM"
            /Pre-?Bid\s+(?:Conference|Meeting)[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Mandatory Pre-Bid: MM/DD/YYYY"
            /(?:Mandatory\s+)?Pre-?Bid[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i
        ];

        for (const pattern of preBidPatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1] + (match[2] ? ' ' + match[2] : '');
                const parsed = this.parseExtractedDate(dateStr);
                if (parsed && this.isReasonableDate(parsed)) {
                    result.preBidDate = parsed;
                    break;
                }
            }
        }

        // ==================== RFI/QUESTIONS DUE EXTRACTION ====================
        // Look specifically for RFI/Questions deadline patterns
        const rfiPatterns = [
            // "Questions due by Month DD, YYYY"
            /Questions?\s+(?:are\s+)?(?:due|must\s+be\s+(?:submitted|received))\s+(?:by|on)[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "RFI Due Date: Month DD, YYYY"
            /RFI\s+(?:Due\s+)?(?:Date)?[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Last day for questions: MM/DD/YYYY"
            /(?:Last\s+day|Deadline)\s+(?:for|to\s+submit)\s+(?:questions?|RFI|inquir)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i,
            // "Inquiries due: Month DD, YYYY"
            /Inquir(?:y|ies)\s+(?:Due|Deadline)[:\s]+(?:\w+day,?\s+)?(\w+\s+\d{1,2},?\s+\d{4})(?:\s+(?:at|by|@)\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i
        ];

        for (const pattern of rfiPatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                const dateStr = match[1] + (match[2] ? ' ' + match[2] : '');
                const parsed = this.parseExtractedDate(dateStr);
                if (parsed && this.isReasonableDate(parsed)) {
                    result.rfiDate = parsed;
                    break;
                }
            }
        }

        return result;
    },

    // Check if a parsed date is reasonable (not in the past by more than a week, not too far in future)
    isReasonableDate(dateStr) {
        if (!dateStr) return false;
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
            return date >= oneWeekAgo && date <= twoYearsFromNow;
        } catch (e) {
            return false;
        }
    },

    // Parse extracted date string to datetime-local format
    parseExtractedDate(dateStr) {
        if (!dateStr) return '';

        try {
            // Clean the string
            let cleaned = dateStr.replace(/[^\d\/\-:\sAaPpMm,\w]/g, ' ').trim();

            let month, day, year;

            // First try named month format: "February 13, 2026" or "January 26, 2026"
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'];
            const namedMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/i);

            if (namedMatch) {
                const monthIdx = monthNames.findIndex(m => m.startsWith(namedMatch[1].toLowerCase()));
                if (monthIdx !== -1) {
                    month = monthIdx + 1;
                    day = parseInt(namedMatch[2]);
                    year = parseInt(namedMatch[3]);
                }
            }

            // Try numeric format: MM/DD/YYYY or MM-DD-YYYY
            if (!month) {
                const numericMatch = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
                if (numericMatch) {
                    month = parseInt(numericMatch[1]);
                    day = parseInt(numericMatch[2]);
                    year = parseInt(numericMatch[3]);

                    // Swap if it looks like day/month format (European)
                    if (month > 12 && day <= 12) {
                        [month, day] = [day, month];
                    }

                    // Handle 2-digit year
                    if (year < 100) {
                        year += year < 50 ? 2000 : 1900;
                    }
                }
            }

            if (!month || !day || !year) return '';

            // Validate date components
            if (month < 1 || month > 12 || day < 1 || day > 31) return '';

            // Format date
            const dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Extract time
            const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i);
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
                            <button class="bid-action-btn ai-predict" onclick="BidTracker.predictBidSuccess(${bid.id})" title="AI Success Prediction">
                                🔮
                            </button>
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
        this.syncToCalendarAndMatrix(); // Sync to Calendar & Matrix
        this.closeModal();
        this.render();
        this.showToast('Bid updated successfully!', 'success');
    },

    // Delete a bid
    deleteBid() {
        if (!confirm('Are you sure you want to delete this bid?')) return;

        this.bids = this.bids.filter(b => b.id !== this.editingBidId);
        this.saveBids();
        this.syncToCalendarAndMatrix(); // Sync to Calendar & Matrix
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

    // AI-powered bid success prediction
    async predictBidSuccess(bidId) {
        const bid = this.bids.find(b => b.id === bidId);
        if (!bid) {
            this.showToast('Bid not found', 'error');
            return;
        }

        // Check if AI is configured
        if (typeof AIService === 'undefined' || !AIService.isConfigured()) {
            this.showToast('Please configure AI in Settings first', 'warning');
            return;
        }

        // Show loading modal
        this.showPredictionModal(bid, null, true);

        try {
            const prediction = await AIService.predictBidSuccess(bid, this.bids);
            this.showPredictionModal(bid, prediction, false);
        } catch (error) {
            console.error('Prediction error:', error);
            this.showToast('Failed to generate prediction: ' + error.message, 'error');
            this.closePredictionModal();
        }
    },

    // Show prediction modal
    showPredictionModal(bid, prediction, loading = false) {
        let modal = document.getElementById('bidPredictionModal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bidPredictionModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        if (loading) {
            modal.innerHTML = `
                <div class="modal-content bid-prediction-modal">
                    <div class="modal-header">
                        <h3>🔮 AI Bid Prediction</h3>
                        <button class="close-btn" onclick="BidTracker.closePredictionModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="ai-loading">
                            <div class="ai-loading-spinner"></div>
                            <span>Analyzing bid for "${this.escapeHtml(bid.projectName)}"...</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (prediction) {
            const scoreClass = prediction.successProbability >= 70 ? 'high' :
                              prediction.successProbability >= 40 ? 'medium' : 'low';

            modal.innerHTML = `
                <div class="modal-content bid-prediction-modal">
                    <div class="modal-header">
                        <h3>🔮 AI Bid Prediction</h3>
                        <button class="close-btn" onclick="BidTracker.closePredictionModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="bid-prediction-card">
                            <div class="prediction-header">
                                <div>
                                    <h4>${this.escapeHtml(bid.projectName)}</h4>
                                    <p style="color: var(--text-secondary); font-size: 13px;">${this.escapeHtml(bid.client)}</p>
                                </div>
                                <div class="prediction-score">
                                    <div class="score-circle ${scoreClass}">
                                        ${prediction.successProbability}%
                                    </div>
                                    <div>
                                        <div class="score-label">Success Rate</div>
                                        <div style="font-size: 12px; color: var(--text-secondary);">
                                            Confidence: ${prediction.confidence}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="prediction-factors">
                                <div class="factor-group positive">
                                    <h5>✅ Positive Factors</h5>
                                    <ul>
                                        ${(prediction.factors?.positive || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('') || '<li>No specific factors identified</li>'}
                                    </ul>
                                </div>
                                <div class="factor-group negative">
                                    <h5>⚠️ Concerns</h5>
                                    <ul>
                                        ${(prediction.factors?.negative || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('') || '<li>No concerns identified</li>'}
                                    </ul>
                                </div>
                                <div class="factor-group neutral">
                                    <h5>ℹ️ Notes</h5>
                                    <ul>
                                        ${(prediction.factors?.neutral || []).map(f => `<li>${this.escapeHtml(f)}</li>`).join('') || '<li>No additional notes</li>'}
                                    </ul>
                                </div>
                            </div>

                            ${prediction.recommendations && prediction.recommendations.length > 0 ? `
                            <div class="prediction-recommendations">
                                <h5>💡 Recommendations</h5>
                                <ul>
                                    ${prediction.recommendations.map(r => `<li>${this.escapeHtml(r)}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}

                            ${prediction.competitiveAnalysis ? `
                            <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
                                <h5 style="margin: 0 0 8px 0; font-size: 13px;">📊 Competitive Analysis</h5>
                                <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">${this.escapeHtml(prediction.competitiveAnalysis)}</p>
                            </div>
                            ` : ''}

                            <div style="margin-top: 16px; display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                                <span>Risk Level: <strong style="color: ${prediction.riskLevel === 'low' ? '#10b981' : prediction.riskLevel === 'high' ? '#ef4444' : '#f59e0b'}">${prediction.riskLevel?.toUpperCase() || 'UNKNOWN'}</strong></span>
                                <span>Analysis powered by AI</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) this.closePredictionModal();
        };
    },

    // Close prediction modal
    closePredictionModal() {
        const modal = document.getElementById('bidPredictionModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
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
    },

    // ==================== Calendar & Matrix Integration ====================

    // Sync all bid events to Calendar and Eisenhower Matrix
    syncToCalendarAndMatrix() {
        if (typeof AppState === 'undefined') {
            console.warn('AppState not available for bid sync');
            return;
        }

        // First, remove all existing bid events
        this.removeBidEventsFromApp();

        // Get active bids only
        const activeBids = this.bids.filter(b => ['researching', 'preparing'].includes(b.status));

        // Add events for each active bid
        activeBids.forEach(bid => {
            this.addBidEventsToApp(bid);
        });

        // Save and refresh views
        if (typeof saveData === 'function') {
            saveData();
        }
        if (typeof renderCalendar === 'function') {
            renderCalendar();
        }
        if (typeof renderEisenhowerMatrix === 'function') {
            renderEisenhowerMatrix();
        }
    },

    // Remove all bid-related events from Calendar and Matrix
    removeBidEventsFromApp() {
        if (typeof AppState === 'undefined') return;

        // Remove from daily calendar
        Object.keys(AppState.data.daily).forEach(dateKey => {
            if (AppState.data.daily[dateKey]?.tasks) {
                AppState.data.daily[dateKey].tasks = AppState.data.daily[dateKey].tasks.filter(
                    task => task.source !== 'bid-tracker'
                );
            }
        });

        // Remove from Eisenhower matrix
        Object.keys(AppState.data.eisenhower).forEach(quadrant => {
            AppState.data.eisenhower[quadrant] = AppState.data.eisenhower[quadrant].filter(
                task => task.source !== 'bid-tracker'
            );
        });
    },

    // Add events for a single bid to Calendar and Matrix
    addBidEventsToApp(bid) {
        if (typeof AppState === 'undefined') return;

        const now = new Date();
        const events = this.generateBidSyncEvents(bid);

        events.forEach(event => {
            if (event.date <= now) return; // Skip past events

            const dateKey = this.formatDateKey(event.date);

            // Add to daily calendar
            if (!AppState.data.daily[dateKey]) {
                AppState.data.daily[dateKey] = { tasks: [] };
            }

            const calendarTask = {
                id: `bid-${bid.id}-${event.type}`,
                text: event.title,
                completed: false,
                source: 'bid-tracker',
                bidId: bid.id,
                eventType: event.type,
                startTime: this.formatTimeString(event.date),
                duration: event.duration || 1,
                color: event.color,
                createdAt: new Date().toISOString()
            };

            // Check if task already exists
            const existingIndex = AppState.data.daily[dateKey].tasks.findIndex(
                t => t.id === calendarTask.id
            );
            if (existingIndex === -1) {
                AppState.data.daily[dateKey].tasks.push(calendarTask);
            }

            // Add urgent/important items to Eisenhower Matrix
            if (event.urgent) {
                const quadrant = 'urgent-important';
                const matrixTask = {
                    id: `bid-${bid.id}-${event.type}`,
                    text: event.title,
                    completed: false,
                    source: 'bid-tracker',
                    bidId: bid.id,
                    eventType: event.type,
                    scheduledDate: dateKey,
                    duration: event.duration || 1,
                    createdAt: new Date().toISOString()
                };

                const existingMatrixIndex = AppState.data.eisenhower[quadrant].findIndex(
                    t => t.id === matrixTask.id
                );
                if (existingMatrixIndex === -1) {
                    AppState.data.eisenhower[quadrant].push(matrixTask);
                }
            }
        });
    },

    // Generate events for syncing (similar to generateEvents but with sync-specific fields)
    generateBidSyncEvents(bid) {
        const events = [];

        // 1. Bid Due Date - URGENT
        if (bid.dueDate) {
            const dueDate = new Date(bid.dueDate);
            events.push({
                date: dueDate,
                type: 'bid-due',
                title: `BID DUE: ${bid.projectName}`,
                color: '#ef4444', // Red
                urgent: true,
                duration: 1
            });

            // Internal: Finalize Bid Package - day before at 12 PM
            const finalizeBid = new Date(dueDate);
            finalizeBid.setDate(finalizeBid.getDate() - 1);
            finalizeBid.setHours(12, 0, 0, 0);
            events.push({
                date: finalizeBid,
                type: 'finalize-bid',
                title: `Finalize Bid Package: ${bid.projectName}`,
                color: '#f59e0b', // Amber
                urgent: true,
                duration: 2
            });

            // Internal: Secure Bid Bond - 3 days before at 9 AM
            const bidBond = new Date(dueDate);
            bidBond.setDate(bidBond.getDate() - 3);
            bidBond.setHours(9, 0, 0, 0);
            events.push({
                date: bidBond,
                type: 'bid-bond',
                title: `Secure Bid Bond: ${bid.projectName}`,
                color: '#f59e0b', // Amber
                urgent: true,
                duration: 1
            });
        }

        // 2. Pre-Bid Meeting
        if (bid.preBidDate) {
            const preBidDate = new Date(bid.preBidDate);
            events.push({
                date: preBidDate,
                type: 'pre-bid',
                title: `Pre-Bid Meeting: ${bid.projectName}`,
                color: '#3b82f6', // Blue
                urgent: true,
                duration: 2
            });
        }

        // 3. RFI Due Date
        if (bid.rfiDate) {
            const rfiDate = new Date(bid.rfiDate);
            events.push({
                date: rfiDate,
                type: 'rfi-due',
                title: `RFI Due: ${bid.projectName}`,
                color: '#8b5cf6', // Purple
                urgent: true,
                duration: 1
            });

            // Internal: Finalize RFI - day before at 12 PM
            const finalizeRfi = new Date(rfiDate);
            finalizeRfi.setDate(finalizeRfi.getDate() - 1);
            finalizeRfi.setHours(12, 0, 0, 0);
            events.push({
                date: finalizeRfi,
                type: 'finalize-rfi',
                title: `Finalize RFI: ${bid.projectName}`,
                color: '#a855f7', // Light purple
                urgent: true,
                duration: 2
            });
        }

        // 4. Site Visit
        if (bid.siteVisit) {
            const siteVisitDate = new Date(bid.siteVisit);
            events.push({
                date: siteVisitDate,
                type: 'site-visit',
                title: `Site Visit: ${bid.projectName}`,
                color: '#10b981', // Green
                urgent: false,
                duration: 2
            });
        }

        return events;
    },

    // Format date to YYYY-MM-DD for AppState keys
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // Format time to HH:MM string
    formatTimeString(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        BidTracker.init();
    }, 100);
});
