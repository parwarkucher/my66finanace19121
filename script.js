let dataRows = [];
let table;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize sort button listener
    const sortBtn = document.getElementById('sortBtn');
    if (sortBtn) {
        sortBtn.addEventListener('click', function() {
            const criteria = document.getElementById('sortBy').value;
            sortTable(criteria);
        });
    }

    // Add event listener for sort dropdown
    const sortByDropdown = document.getElementById('sortBy');
    if (sortByDropdown) {
        sortByDropdown.addEventListener('change', function() {
            const criteria = this.value;
            sortTable(criteria);
        });
    }

    // Add event listeners for save, backup, and restore buttons
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveData);
    }

    const loadBtn = document.getElementById('loadBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadData);
    }

    function loadData() {
        const savedData = localStorage.getItem('csvAnalyzerData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                dataRows = data.dataRows.map(row => ({
                    ...row,
                    row: createRowElement(row)
                }));
                
                // Restore tags
                const tagsList = document.getElementById('tagsList');
                tagsList.innerHTML = '';
                data.tags.forEach(tag => {
                    createTagButton(tag.name, tag.color);
                });
                
                // Redraw the table
                redrawTable();
                
                // Recalculate totals
                updateTotals();
                
                // Add event listeners to tag buttons
                addTagButtonListeners();
                
                // Reattach event listeners for adding and saving tags
                document.getElementById('addTagBtn').addEventListener('click', addNewTag);
                document.getElementById('saveTagsBtn').addEventListener('click', saveTags);
                
                alert('Data loaded successfully!');
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Error loading data. Please try saving your data again.');
            }
        } else {
            alert('No saved data found.');
        }
    }

    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
        backupBtn.addEventListener('click', backupData);
    }

    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', () => document.getElementById('restoreFileInput').click());
    }

    const restoreFileInput = document.getElementById('restoreFileInput');
    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', restoreData);
    }

    const uploadBtn = document.getElementById('uploadBtn');
    const uploadWithDuplicateCheckBtn = document.getElementById('uploadWithDuplicateCheckBtn');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            uploadCSV(false);
        });
    }

    if (uploadWithDuplicateCheckBtn) {
        uploadWithDuplicateCheckBtn.addEventListener('click', function() {
            uploadCSV(true);
        });
    }

    // Add this function at the beginning of the script
    function standardizeDate(dateString) {
        try {
            // First try direct parsing
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().slice(0, 19).replace('T', ' ');
            }
            
            // If that fails, try manual parsing
            const parts = dateString.split(/[-/]/);
            if (parts.length === 3) {
                // Assume year is either first or last
                let year, month, day;
                if (parts[0].length === 4) {
                    // YYYY-MM-DD format
                    [year, month, day] = parts;
                } else {
                    // DD/MM/YYYY format
                    [day, month, year] = parts;
                }
                
                const parsedDate = new Date(year, parseInt(month) - 1, day);
                if (!isNaN(parsedDate.getTime())) {
                    return parsedDate.toISOString().slice(0, 19).replace('T', ' ');
                }
            }
            
            // If all parsing fails, return the original string
            return dateString;
        } catch (e) {
            // If any error occurs, return the original string
            return dateString;
        }
    }

    function uploadCSV(checkDuplicates) {
        const fileInput = document.getElementById('csvFileInput');
        const tableContainer = document.getElementById('tableContainer');

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = function(event) {
                const csvData = event.target.result;
                const rows = csvData.split('\n');
                
                if (!table) {
                    table = document.createElement('table');
                    const headerRow = document.createElement('tr');
                    const headers = rows[0].split(',');
                    headers.push('Tags'); // Add Tags column
                    headers.forEach(headerText => {
                        const header = document.createElement('th');
                        header.textContent = headerText.trim();
                        headerRow.appendChild(header);
                    });
                    table.appendChild(headerRow);
                }

                for (let i = 1; i < rows.length; i++) {
                    const rowData = rows[i].split(',');
                    if (rowData.length === table.rows[0].cells.length - 1) {
                        const date = standardizeDate(rowData[0].trim());
                        const type = rowData[1].trim();
                        const amount = parseFloat(rowData[2]);
                        const note = rowData[3].trim();

                        // Check for duplicates if checkDuplicates is true
                        const isDuplicate = checkDuplicates && dataRows.some(existingRow => 
                            existingRow.date === date &&
                            existingRow.type === type && 
                            existingRow.amount === amount &&
                            existingRow.note === note
                        );

                        if (!isDuplicate) {
                            const row = document.createElement('tr');
                            rowData.forEach((cellText, index) => {
                                const cell = document.createElement('td');
                                if (index === 0) { // Date column
                                    cell.textContent = date;
                                } else if (index === 2) { // Amount column
                                    cell.textContent = formatNumberWithCommas(amount.toFixed(2));
                                } else {
                                    cell.textContent = cellText.trim();
                                }
                                row.appendChild(cell);
                            });
                            const tagsCell = document.createElement('td');
                            tagsCell.textContent = ''; // Initialize tags cell
                            row.appendChild(tagsCell);
                            table.appendChild(row);

                            dataRows.push({
                                row,
                                date,
                                type,
                                amount,
                                note,
                                tags: ''
                            });
                        }
                    }
                }

                // Sort table by date
                sortTable('date');

                // Update the table in the DOM
                tableContainer.innerHTML = '';
                tableContainer.appendChild(table);

                // Recalculate totals
                updateTotals();

                // Add event listeners
                document.getElementById('addTagBtn').addEventListener('click', addNewTag);
                document.getElementById('saveTagsBtn').addEventListener('click', saveTags);
                addTagButtonListeners();
            };

            reader.readAsText(file);
        } else {
            alert('Please select a CSV file to upload.');
        }
    }

    // Update existing data rows
    dataRows.forEach(row => {
        row.date = standardizeDate(row.date);
        row.row.cells[0].textContent = row.date;
    });

    function updateTotals() {
        let total = 0;
        let expenses = 0;
        let incomes = 0;

        dataRows.forEach(data => {
            const amount = data.amount;
            const type = data.type;

            total += amount;

            if (type.includes('Expense')) {
                expenses += amount;
                total -= amount;
            } else if (type.includes('Income')) {
                incomes += amount;
                total += amount;
            }
        });

        document.getElementById('totalAmount').textContent = formatNumberWithCommas(Math.abs(total).toFixed(2)) + ' IQD';
        document.getElementById('totalExpenses').textContent = formatNumberWithCommas(expenses.toFixed(2)) + ' IQD';
        document.getElementById('totalIncomes').textContent = formatNumberWithCommas(incomes.toFixed(2)) + ' IQD';
        const remainingIQD = incomes - expenses;
        const exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
        const remainingUSD = remainingIQD / exchangeRate;
        document.getElementById('remainingMoney').textContent = formatNumberWithCommas(remainingUSD.toFixed(2)) + ' USD';
        document.getElementById('remainingMoneyIQD').textContent = formatNumberWithCommas(remainingIQD.toFixed(2)) + ' IQD';
    }

    function addNewTag() {
        const newTag = document.getElementById('newTagInput').value.trim();
        const tagColor = document.getElementById('tagColorPicker').value;
        if (newTag) {
            const tagsList = document.getElementById('tagsList');
            const tagButton = document.createElement('button');
            tagButton.textContent = newTag;
            tagButton.classList.add('tagButton');
            tagButton.style.backgroundColor = tagColor;
            tagButton.style.color = getContrastColor(tagColor);
            tagsList.appendChild(tagButton);

            const rows = document.querySelectorAll('#tableContainer tr');
            rows.forEach((row, index) => {
                if (index > 0) { // Skip header row
                    const noteCell = row.children[3]; // Note column
                    const tagsCell = row.children[4]; // Tags column
                    const noteContainsTag = noteCell.textContent.toLowerCase().includes(newTag.toLowerCase());

                    if (noteContainsTag) {
                        row.classList.add('highlight');
                        row.style.backgroundColor = tagColor;
                        if (!row.querySelector(`input[type="checkbox"][data-tag="${newTag}"]`)) {
                            const newCheckbox = document.createElement('input');
                            newCheckbox.type = 'checkbox';
                            newCheckbox.dataset.tag = newTag;
                            newCheckbox.dataset.color = tagColor;
                            newCheckbox.classList.add('tag-checkbox');
                            row.appendChild(newCheckbox);
                        }
                    }
                }
            });

            // Add click event listener to the new tag button
            addTagButtonListeners();

            // Clear the input field
            document.getElementById('newTagInput').value = '';
        }
    }

    // Function to sort the table
    function sortTable(criteria) {
        // Store the header row
        const headerRow = table.rows[0];

        dataRows.sort((a, b) => {
            switch (criteria) {
                case 'date':
                    return new Date(b.date) - new Date(a.date); // Changed to sort from newest to oldest
                case 'expenses':
                    if (a.type.includes('Expense') && b.type.includes('Expense')) {
                        return b.amount - a.amount;
                    } else if (a.type.includes('Expense')) {
                        return -1;
                    } else if (b.type.includes('Expense')) {
                        return 1;
                    }
                    return 0;
                case 'income':
                    if (a.type.includes('Income') && b.type.includes('Income')) {
                        return b.amount - a.amount;
                    } else if (a.type.includes('Income')) {
                        return -1;
                    } else if (b.type.includes('Income')) {
                        return 1;
                    }
                    return 0;
                case 'tags':
                    const aTags = a.row.children[4].textContent.trim();
                    const bTags = b.row.children[4].textContent.trim();
                    if (aTags === '' && bTags === '') return 0;
                    if (aTags === '') return 1;
                    if (bTags === '') return -1;
                    return aTags.localeCompare(bTags);
                default:
                    return 0;
            }
        });

        // Clear the table
        table.innerHTML = '';

        // Re-add the header row
        table.appendChild(headerRow);

        // Re-add sorted rows
        dataRows.forEach(data => {
            table.appendChild(data.row);
        });
    }


    // Function to get contrasting text color (black or white) based on background color
    function getContrastColor(hexColor) {
        // If hexColor is undefined or invalid, return black
        if (!hexColor || !/^#[0-9A-F]{6}$/i.test(hexColor)) {
            return 'black';
        }
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    // Function to toggle tag visibility and highlighting
    function toggleTag(tag) {
        const rows = tableContainer.querySelectorAll('tr');
        const tagButton = Array.from(document.querySelectorAll('.tagButton')).find(btn => btn.textContent === tag);
        const tagColor = tagButton ? tagButton.style.backgroundColor : '';

        rows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const noteCell = row.children[3]; // Note column
                const tagsCell = row.children[4]; // Tags column
                const noteContainsTag = noteCell.textContent.toLowerCase().includes(tag.toLowerCase());
                let checkbox = row.querySelector(`input[type="checkbox"][data-tag="${tag}"]`);
                
                if (!checkbox) {
                    // Create new checkbox if it doesn't exist
                    checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.dataset.tag = tag;
                    checkbox.dataset.color = tagColor;
                    checkbox.classList.add('tag-checkbox');
                    row.appendChild(checkbox);
                }
                
                // Set checkbox state based on whether the tag is in the tags column
                const currentTags = tagsCell.textContent.split(', ').map(t => t.trim());
                checkbox.checked = currentTags.includes(tag.trim());
                
                // Highlight row if checkbox is checked or note contains tag
                if (checkbox.checked || noteContainsTag) {
                    row.classList.add('highlight');
                    row.style.backgroundColor = tagColor;
                } else {
                    row.classList.remove('highlight');
                    row.style.backgroundColor = '';
                }
            }
        });
    }

    // Function to save tags
    function saveTags() {
        const rows = tableContainer.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const checkboxes = row.querySelectorAll('input[type="checkbox"]');
                const tagsCell = row.children[4]; // Tags column
                const existingTags = tagsCell.textContent.split(', ').filter(tag => tag.trim() !== '');
                const newTags = Array.from(checkboxes)
                    .filter(checkbox => checkbox.checked)
                    .map(checkbox => checkbox.dataset.tag);
            
                // Combine existing tags with new tags, removing duplicates
                const updatedTags = [...new Set([...existingTags, ...newTags])];
                tagsCell.textContent = updatedTags.join(', ');
            
                // Update row styling
                if (updatedTags.length > 0) {
                    row.classList.add('highlight');
                    const lastTag = updatedTags[updatedTags.length - 1];
                    const tagButton = Array.from(document.querySelectorAll('.tagButton')).find(btn => btn.textContent === lastTag);
                    if (tagButton) {
                        row.style.backgroundColor = tagButton.style.backgroundColor;
                    }
                } else {
                    row.classList.remove('highlight');
                    row.style.backgroundColor = '';
                }
            
                // Keep checkboxes for future editing
                checkboxes.forEach(checkbox => {
                    checkbox.style.display = 'none';
                });
            }
        });
    
        // Update dataRows array
        dataRows.forEach((data, index) => {
            const row = table.rows[index + 1]; // +1 to skip header row
            if (row) {
                const tagsCell = row.children[4];
                data.tags = tagsCell.textContent.split(', ').filter(tag => tag.trim() !== '');
            }
        });
    }

    // Function to show checkboxes for editing
    function showCheckboxesForEditing(tag) {
        const rows = tableContainer.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const checkbox = row.querySelector(`input[type="checkbox"][data-tag="${tag}"]`);
                if (checkbox) {
                    checkbox.style.display = 'inline';
                }
            }
        });
    }

    // Add event listeners to existing tag buttons
    function addTagButtonListeners() {
        document.querySelectorAll('.tagButton').forEach(button => {
            button.addEventListener('click', function() {
                toggleTag(this.textContent);
                showCheckboxesForEditing(this.textContent);
            });
        });
    }

    document.getElementById('analyzeBtn').addEventListener('click', function() {
        const totalAmount = document.getElementById('totalAmount').textContent;
        const totalExpenses = document.getElementById('totalExpenses').textContent;
        const totalIncomes = document.getElementById('totalIncomes').textContent;
        const remainingMoney = document.getElementById('remainingMoney').textContent;
        const remainingMoneyIQD = document.getElementById('remainingMoneyIQD').textContent;

        const data = {
            totalAmount,
            totalExpenses,
            totalIncomes,
            remainingMoney,
            remainingMoneyIQD,
            rows: []
        };

        const tableRows = document.querySelectorAll('#tableContainer tr');
        tableRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const cells = row.querySelectorAll('td');
                const amount = parseFloat(cells[2].textContent.replace(/,/g, ''));
                
                data.rows.push([
                    cells[0].textContent, // Date
                    cells[1].textContent, // Type
                    amount.toFixed(2) + ' IQD', // Amount in IQD
                    cells[3].textContent, // Note
                    cells[4].textContent  // Tags
                ]);
            }
        });

        const newWindow = window.open('analyzer.html', 'Analyzer', 'width=600,height=400');
        setTimeout(() => {
            newWindow.postMessage(data, '*');
        }, 500); // Adjust the timeout as needed
    });

    document.getElementById('tagAnalyzeBtn').addEventListener('click', function() {
        const data = {
            tags: {},
            rows: []
        };

        const tableRows = document.querySelectorAll('#tableContainer tr');
        tableRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const cells = row.querySelectorAll('td');
                const amount = parseFloat(cells[2].textContent.replace(/,/g, ''));
                const tags = cells[4].textContent.split(', ').filter(tag => tag.trim() !== '');
                
                tags.forEach(tag => {
                    if (!data.tags[tag]) {
                        data.tags[tag] = { count: 0, income: 0, expenses: 0 };
                    }
                    data.tags[tag].count++;
                    if (cells[1].textContent.includes('Income')) {
                        data.tags[tag].income += amount;
                    } else if (cells[1].textContent.includes('Expense')) {
                        data.tags[tag].expenses += amount;
                    }
                });

                data.rows.push({
                    date: cells[0].textContent,
                    type: cells[1].textContent,
                    amount: amount,
                    note: cells[3].textContent,
                    tags: tags
                });
            }
        });

        const newWindow = window.open('taganalyzer.html', 'Tag Analyzer', 'width=800,height=600');
        setTimeout(() => {
            newWindow.postMessage(data, '*');
        }, 500); // Adjust the timeout as needed
    });

    document.getElementById('aiAnalyzeBtn').addEventListener('click', function() {
        const data = {
            rows: [],
            totalAmount: document.getElementById('totalAmount').textContent,
            totalExpenses: document.getElementById('totalExpenses').textContent,
            totalIncomes: document.getElementById('totalIncomes').textContent,
            remainingMoney: document.getElementById('remainingMoney').textContent,
            remainingMoneyIQD: document.getElementById('remainingMoneyIQD').textContent
        };

        const tableRows = document.querySelectorAll('#tableContainer tr');
        tableRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const cells = row.querySelectorAll('td');
                data.rows.push({
                    date: cells[0].textContent,
                    type: cells[1].textContent,
                    amount: cells[2].textContent,
                    note: cells[3].textContent,
                    tags: cells[4].textContent
                });
            }
        });

        const newWindow = window.open('aianalyzer.html', 'AI Analyzer', 'width=800,height=600');
        setTimeout(() => {
            newWindow.postMessage(data, '*');
        }, 500); // Adjust the timeout as needed
    });

    // Add event listener for messages from the analyzer window
    window.addEventListener('message', function(event) {
        if (event.data.action === 'highlightRows') {
            highlightTableRows(event.data.tag, event.data.type);
        } else if (event.data.action === 'highlightFinancialRow') {
            highlightFinancialRow(event.data.date, event.data.type);
        }
    });

    function highlightTableRows(tag, type) {
        const tableRows = document.querySelectorAll('#tableContainer tr');
        tableRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const cells = row.querySelectorAll('td');
                const rowType = cells[1].textContent;
                const rowTags = cells[4].textContent;
                
                if (rowTags.includes(tag) && rowType.includes(type)) {
                    row.classList.add('highlight');
                } else {
                    row.classList.remove('highlight');
                }
            }
        });
    }

    function highlightFinancialRow(date, type) {
        const tableRows = document.querySelectorAll('#tableContainer tr');
        tableRows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const cells = row.querySelectorAll('td');
                const rowDate = cells[0].textContent;
                const rowType = cells[1].textContent;
                
                if (rowDate === date && rowType.includes(type)) {
                    row.classList.add('highlight');
                } else {
                    row.classList.remove('highlight');
                }
            }
        });
    }

    function formatNumberWithCommas(number) {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function saveData() {
        const data = {
            dataRows: dataRows.map(row => ({
                ...row,
                tags: row.row.querySelector('td:nth-child(5)').textContent.split(', ').filter(tag => tag.trim() !== '')
            })),
            tags: Array.from(document.querySelectorAll('.tagButton')).map(btn => ({
                name: btn.textContent,
                color: btn.style.backgroundColor
            }))
        };
        localStorage.setItem('csvAnalyzerData', JSON.stringify(data));
        alert('Data saved successfully!');
    }

    function backupData() {
        const data = {
            dataRows: dataRows.map(row => ({
                ...row,
                note: row.row.querySelector('td:nth-child(4)').textContent,
                tags: row.row.querySelector('td:nth-child(5)').textContent.split(', ').filter(tag => tag.trim() !== '')
            })),
            tags: Array.from(document.querySelectorAll('.tagButton')).map(btn => ({
                name: btn.textContent,
                color: btn.style.backgroundColor
            })),
            savedChats: JSON.parse(localStorage.getItem('savedChats') || '{}')
        };
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'csv_analyzer_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function restoreData(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    dataRows = data.dataRows.map(row => ({
                        ...row,
                        row: createRowElement(row)
                    }));
                
                    // Restore tags
                    const tagsList = document.getElementById('tagsList');
                    tagsList.innerHTML = '';
                    data.tags.forEach(tag => {
                        createTagButton(tag.name, tag.color);
                    });
                
                    // Restore savedChats
                    if (data.savedChats && typeof data.savedChats === 'object') {
                        localStorage.setItem('savedChats', JSON.stringify(data.savedChats));
                        console.log('Restored savedChats:', data.savedChats);
                    } else {
                        console.warn('No valid savedChats found in backup');
                    }
                
                    // Redraw the table
                    redrawTable();
                
                    // Recalculate totals
                    updateTotals();
                
                    // Add event listeners to tag buttons
                    addTagButtonListeners();
                
                    // Reattach event listeners for adding and saving tags
                    document.getElementById('addTagBtn').removeEventListener('click', addNewTag);
                    document.getElementById('saveTagsBtn').removeEventListener('click', saveTags);
                    document.getElementById('addTagBtn').addEventListener('click', addNewTag);
                    document.getElementById('saveTagsBtn').addEventListener('click', saveTags);
                
                    // Reattach event listeners for tag buttons
                    document.querySelectorAll('.tagButton').forEach(button => {
                        button.removeEventListener('click', toggleTag);
                        button.addEventListener('click', () => toggleTag(button.textContent));
                    });
                
                    alert('Data restored successfully!');
                } catch (error) {
                    console.error('Error restoring data:', error);
                    alert('Error restoring data. Please check the file format.');
                }
            };
            reader.readAsText(file);
        }
    }

    function addNewTag() {
        const newTag = document.getElementById('newTagInput').value.trim();
        const tagColor = document.getElementById('tagColorPicker').value;
        if (newTag) {
            const tagButton = createTagButton(newTag, tagColor);
        
            // Automatically check/select rows containing the tag name
            const rows = document.querySelectorAll('#tableContainer tr');
            rows.forEach((row, index) => {
                if (index > 0) { // Skip header row
                    const noteCell = row.children[3]; // Note column
                    const tagsCell = row.children[4]; // Tags column
                    const noteContainsTag = noteCell.textContent.toLowerCase().includes(newTag.toLowerCase());
                
                    if (noteContainsTag) {
                        let checkbox = row.querySelector(`input[type="checkbox"][data-tag="${newTag}"]`);
                        if (!checkbox) {
                            checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.dataset.tag = newTag;
                            checkbox.dataset.color = tagColor;
                            checkbox.classList.add('tag-checkbox');
                            row.appendChild(checkbox);
                        }
                        checkbox.checked = true;
                        row.classList.add('highlight');
                        row.style.backgroundColor = tagColor;
                    }
                }
            });
        
            // Add event listener to the new tag button
            tagButton.addEventListener('click', () => toggleTag(newTag));
        
            document.getElementById('newTagInput').value = '';
        }
    }

    function toggleTag(tag) {
        const rows = document.querySelectorAll('#tableContainer tr');
        const tagButton = Array.from(document.querySelectorAll('.tagButton')).find(btn => btn.textContent === tag);
        const tagColor = tagButton ? tagButton.style.backgroundColor : '';

        rows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                const noteCell = row.children[3]; // Note column
                const tagsCell = row.children[4]; // Tags column
                const noteContainsTag = noteCell.textContent.toLowerCase().includes(tag.toLowerCase());
                let checkbox = row.querySelector(`input[type="checkbox"][data-tag="${tag}"]`);
            
                if (!checkbox) {
                    // Create new checkbox if it doesn't exist
                    checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.dataset.tag = tag;
                    checkbox.dataset.color = tagColor;
                    checkbox.classList.add('tag-checkbox');
                    row.appendChild(checkbox);
                }
            
                // Set checkbox state based on whether the tag is in the tags column
                const currentTags = tagsCell.textContent.split(', ').map(t => t.trim());
                checkbox.checked = currentTags.includes(tag.trim());
            
                // Highlight row if checkbox is checked or note contains tag
                if (checkbox.checked || noteContainsTag) {
                    row.classList.add('highlight');
                    row.style.backgroundColor = tagColor;
                } else {
                    row.classList.remove('highlight');
                    row.style.backgroundColor = '';
                }
            
                // Toggle checkbox visibility
                checkbox.style.display = checkbox.style.display === 'none' ? 'inline' : 'none';
            }
        });
    }

    function createTagButton(name, color) {
        const tagsList = document.getElementById('tagsList');
        const tagButton = document.createElement('button');
        tagButton.textContent = name;
        tagButton.classList.add('tagButton');
        tagButton.style.backgroundColor = color;
        tagButton.style.color = getContrastColor(color);
        tagsList.appendChild(tagButton);
        return tagButton;
    }

    function addNewTag() {
        const newTag = document.getElementById('newTagInput').value.trim();
        const tagColor = document.getElementById('tagColorPicker').value;
        if (newTag) {
            createTagButton(newTag, tagColor);
            
            // Automatically check/select rows containing the tag name
            const rows = document.querySelectorAll('#tableContainer tr');
            rows.forEach((row, index) => {
                if (index > 0) { // Skip header row
                    const noteCell = row.children[3]; // Note column
                    const tagsCell = row.children[4]; // Tags column
                    const noteContainsTag = noteCell.textContent.toLowerCase().includes(newTag.toLowerCase());
                    
                    if (noteContainsTag) {
                        let checkbox = row.querySelector(`input[type="checkbox"][data-tag="${newTag}"]`);
                        if (!checkbox) {
                            checkbox = document.createElement('input');
                            checkbox.type = 'checkbox';
                            checkbox.dataset.tag = newTag;
                            checkbox.dataset.color = tagColor;
                            checkbox.classList.add('tag-checkbox');
                            row.appendChild(checkbox);
                        }
                        checkbox.checked = true;
                        row.classList.add('highlight');
                        row.style.backgroundColor = tagColor;
                    }
                }
            });
            
            addTagButtonListeners();
            document.getElementById('newTagInput').value = '';
        }
    }



    function updateTotals() {
        let total = 0;
        let expenses = 0;
        let incomes = 0;

        dataRows.forEach(data => {
            const amount = data.amount;
            const type = data.type;

            total += amount;
            if (type.includes('Expense')) {
                expenses += amount;
            } else if (type.includes('Income')) {
                incomes += amount;
            }
        });

        document.getElementById('totalAmount').textContent = formatNumberWithCommas(total.toFixed(2)) + ' IQD';
        document.getElementById('totalExpenses').textContent = formatNumberWithCommas(expenses.toFixed(2)) + ' IQD';
        document.getElementById('totalIncomes').textContent = formatNumberWithCommas(incomes.toFixed(2)) + ' IQD';
        const remainingIQD = incomes - expenses;
        const exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
        const remainingUSD = remainingIQD / exchangeRate;
        document.getElementById('remainingMoney').textContent = formatNumberWithCommas(remainingUSD.toFixed(2)) + ' USD';
        document.getElementById('remainingMoneyIQD').textContent = formatNumberWithCommas(remainingIQD.toFixed(2)) + ' IQD';
    }

    // Add event listeners for edit and save edit buttons
    const editTableBtn = document.getElementById('editTableBtn');
    const saveEditTableBtn = document.getElementById('saveEditTableBtn');

    if (editTableBtn) {
        editTableBtn.addEventListener('click', makeTableEditable);
    }

    if (saveEditTableBtn) {
        saveEditTableBtn.addEventListener('click', saveTableEdit);
    }

function updateRemainingMoney() {
    const remainingMoneyIQD = parseFloat(document.getElementById('remainingMoneyIQD').textContent.replace(/,/g, ''));
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
    const remainingMoneyUSD = remainingMoneyIQD / exchangeRate;
    document.getElementById('remainingMoney').textContent = formatNumberWithCommas(remainingMoneyUSD.toFixed(2));
}

    document.getElementById('exchangeRate').addEventListener('input', updateRemainingMoney);
    
    // Call this function initially to set the correct USD value
    updateRemainingMoney();
}); // Close the DOMContentLoaded event listener

function makeTableEditable() {
    const table = document.querySelector('#tableContainer table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, rowIndex) => {
            if (rowIndex === 0) return; // Skip header row
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, cellIndex) => {
                if (cellIndex !== 4) { // Skip Tags column
                    const content = cell.textContent;
                    cell.innerHTML = `<input type="text" value="${content}">`;
                }
            });
        });
    }
}

function saveTableEdit() {
    const table = document.querySelector('#tableContainer table');
    if (table) {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, rowIndex) => {
            if (rowIndex === 0) return; // Skip header row
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, cellIndex) => {
                if (cellIndex !== 4) { // Skip Tags column
                    const input = cell.querySelector('input');
                    if (input) {
                        const newValue = input.value;
                        cell.textContent = newValue;
                        // Update dataRows array
                        const key = table.rows[0].cells[cellIndex].textContent.toLowerCase();
                        if (key === 'amount') {
                            dataRows[rowIndex - 1][key] = parseFloat(newValue.replace(/,/g, ''));
                        } else {
                            dataRows[rowIndex - 1][key] = newValue;
                        }
                        // Update the row property of dataRows
                        dataRows[rowIndex - 1].row = row;
                    }
                }
            });
        });
    }
    updateTotals();
}

function updateTotals() {
    let total = 0;
    let expenses = 0;
    let incomes = 0;

    dataRows.forEach(data => {
        const amount = data.amount;
        const type = data.type;

        total += amount;
        if (type.includes('Expense')) {
            expenses += amount;
        } else if (type.includes('Income')) {
            incomes += amount;
        }
    });

    document.getElementById('totalAmount').textContent = formatNumberWithCommas(total.toFixed(2)) + ' IQD';
    document.getElementById('totalExpenses').textContent = formatNumberWithCommas(expenses.toFixed(2)) + ' IQD';
    document.getElementById('totalIncomes').textContent = formatNumberWithCommas(incomes.toFixed(2)) + ' IQD';
    const remainingIQD = incomes - expenses;
    const remainingUSD = remainingIQD; // Assuming no USD conversion
    document.getElementById('remainingMoneyIQD').textContent = formatNumberWithCommas(remainingIQD.toFixed(2));
    // Call the function to update USD value
    updateRemainingMoney();
}

// Move formatNumberWithCommas function outside of DOMContentLoaded
function formatNumberWithCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Move createTagButton function outside of DOMContentLoaded
function createTagButton(name, color) {
    const tagsList = document.getElementById('tagsList');
    const tagButton = document.createElement('button');
    tagButton.textContent = name;
    tagButton.classList.add('tagButton');
    tagButton.style.backgroundColor = color;
    tagButton.style.color = getContrastColor(color);
    tagsList.appendChild(tagButton);
    return tagButton;
}

// Move createRowElement function outside of DOMContentLoaded
function createRowElement(rowData) {
    const row = document.createElement('tr');
    ['date', 'type', 'amount', 'note'].forEach(key => {
        const cell = document.createElement('td');
        if (key === 'amount') {
            cell.textContent = formatNumberWithCommas(parseFloat(rowData[key]).toFixed(2));
        } else {
            cell.textContent = rowData[key] || ''; // Use empty string if the value is undefined
        }
        row.appendChild(cell);
    });
    const tagsCell = document.createElement('td');
    tagsCell.textContent = Array.isArray(rowData.tags) ? rowData.tags.join(', ') : rowData.tags || '';
    row.appendChild(tagsCell);
    return row;
}

function redrawTable() {
    const tableContainer = document.getElementById('tableContainer');
    tableContainer.innerHTML = '';
    table = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['Date', 'Type', 'Amount', 'Note', 'Tags'].forEach(headerText => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });
    table.appendChild(headerRow);
    
    dataRows.forEach(data => {
        const row = document.createElement('tr');
        ['date', 'type', 'amount', 'note', 'tags'].forEach(key => {
            const cell = document.createElement('td');
            if (key === 'amount') {
                cell.textContent = formatNumberWithCommas(parseFloat(data[key]).toFixed(2));
            } else {
                cell.textContent = data[key];
            }
            row.appendChild(cell);
        });
        table.appendChild(row);
    });
    
    tableContainer.appendChild(table);
}
