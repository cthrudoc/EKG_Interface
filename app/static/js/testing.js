document.addEventListener('DOMContentLoaded', function() {
    const tester1 = document.getElementById('tester1');
    const tester2 = document.getElementById('tester2');
    const tester3 = document.getElementById('tester3');
    const timespanTable = document.getElementById('timespanTable');
    const allPlots = [tester1, tester2, tester3];

    fetch('/api/wykres')
        .then(response => response.json())
        .then(data => {
            console.log('[wykres.js] Received data:', data);  // [DEBUG] 
            const ecgData = data.initial_chart_data.ECG;
            const timespans = data.timespans || [];
            const initialTimespan = data.initial_timespan?.[0] || {};
            console.log('[wykres.js] Timespans:', timespans); // [DEBUG]
            let chartId = data.chart_id

            // Calculate the data bounds
            const xMin = Math.min(...ecgData.time);
            const xMax = Math.max(...ecgData.time);

            // [TODO] Creating initial timespan
            let initialTimespanStart = initialTimespan.start_time;
            let initalTimespanEnd = initialTimespan.end_time;
            
            // Modified trace styling to look like ECG printer output
            const traces = [
                { 
                    x: ecgData.time, 
                    y: ecgData.ch1, 
                    type: 'scatter', 
                    mode: 'lines', 
                    name: 'Lead I',
                    line: {
                        color: '#000000',
                        width: 1,
                        shape: 'linear'
                    }
                },
                { 
                    x: ecgData.time, 
                    y: ecgData.ch2, 
                    type: 'scatter', 
                    mode: 'lines', 
                    name: 'Lead II',
                    line: {
                        color: '#000000',
                        width: 1,
                        shape: 'linear'
                    }
                },
                { 
                    x: ecgData.time, 
                    y: ecgData.ch3, 
                    type: 'scatter', 
                    mode: 'lines', 
                    name: 'Lead III',
                    line: {
                        color: '#000000',
                        width: 1,
                        shape: 'linear'
                    }
                }
            ];

            let shapes_coordinates = timespans.length > 0
            ? { x0: timespans[0].start_time, x1: timespans[0].end_time }
            : { x0: 0, x1: 0 }; // Default to avoid errors if timespans is empty

            // Add calibration pulse
            /*
            // [BUG] IS DISPLAYED ON FIXED X, CHANGE TO DYNAMIC OR DISABLE COMPLETELY
            // [BUG] Needs to be added to the plots when they are created 
            const calibrationPulse = {
                x: [0, 0, 0.2, 0.2],
                y: [0, 1, 1, 0],
                type: 'scatter',
                mode: 'lines',
                name: 'Calibration',
                line: {
                    color: '#000000',
                    width: 1
                },
                showlegend: false
            };
            */

            const layout = {    
                plot_bgcolor: '#FFF4F4',
                paper_bgcolor: '#FFF4F4',
                font: {
                    color: '#000000',
                    family: 'Arial'
                },
                xaxis: {
                    title: 'Time (seconds)',
                    range: [initialTimespanStart, initalTimespanEnd],
                    constrain: 'domain',
                    nticks: 10,  // Maximum of 10 tick labels on the x-axis
                    tickmode: 'auto',  // Let Plotly adjust tick placement
                    dtick: 0.5,
                    tickmode: 'linear',
                    rangeslider: {
                        visible: true,
                        range: [xMin, xMax],
                        bgcolor: '#FFF4F4',
                        bordercolor: '#FF0000'
                    },
                    gridcolor: '#FF9999',
                    gridwidth: 0.5,
                    zerolinecolor: '#FF0000',
                    showticklabels: false,
                    tickcolor: '#000000',
                    tickfont: { color: '#000000' },
                    minor: {
                        ticklen: 3,
                        tickwidth: 0.5,
                        dtick: 0.04
                    }
                },
                yaxis: { 
                    title: 'Voltage (mV)',
                    gridcolor: '#FF9999',
                    nticks: 10,  // Maximum of 10 tick labels on the x-axis
                    tickmode: 'auto',  // Let Plotly adjust tick placement
                    gridwidth: 0.5,
                    dtick: 0.5,
                    tickmode: 'linear',
                    zerolinecolor: '#FF0000',
                    zerolinewidth: 1,
                    showticklabels: true ,
                    tickcolor: '#000000',
                    tickfont: { color: '#000000' },
                    minor: {
                        ticklen: 3,
                        tickwidth: 0.5,
                        dtick: 0.1,
                        gridcolor: '#FF9999',
                        gridwidth: 0.5
                    },
                    range: [-1.5, 1.5]
                },
                margin: { t: 40, r: 50, l: 50, b: 40 },
                modeBarButtonsToRemove: ['select2d', 'lasso2d'],
                displaylogo: false,
                shapes: [{
                    type: 'rect',
                    xref: 'x',
                    yref: 'paper',
                    x0: shapes_coordinates.x0,
                    x1: shapes_coordinates.x1,
                    y0: 0,
                    y1: 1,
                    fillcolor: 'rgba(255,0,0, 0.2)',
                    line: { width: 0 }
                }] , // Shapes set outside as a let so they can get updated
                /*
                // [BUG] Do those annotations even make sense in dynamic context of the app? 
                annotations: [
                    {
                        x: 0.02,
                        y: -1.3,
                        xref: 'paper',
                        yref: 'y',
                        text: '25 mm/sec',
                        showarrow: false,
                        font: {
                            size: 10,
                            color: '#000000'
                        }
                    },
                    {
                        x: 0.02,
                        y: 1.3,
                        xref: 'paper',
                        yref: 'y',
                        text: '10 mm/mV',
                        showarrow: false,
                        font: {
                            size: 10,
                            color: '#000000'
                        }
                    }
                ],
                */
                showlegend: false,
                legend: {
                    font: { color: '#000000' },
                    bgcolor: '#FFF4F4',
                    bordercolor: '#FF0000'
                }
            };

            const config = {
                responsive: true,
                scrollZoom: true,
                modeBarButtonsToAdd: [{
                    name: 'Reset axes',
                    click: function(gd) {
                        Plotly.relayout(gd, {
                            'xaxis.range': [xMin, xMax],
                            'xaxis.rangeslider.range': [xMin, xMax]
                        });
                    }
                }]
            };

            // Create plots with range sliders 
            // [BUG] After traces[] in the first plot, I deleted calibratonPulse because I disabled it. If fixed later, can be added later. 
            Plotly.newPlot(tester1, [traces[0]], layout, config);
            Plotly.newPlot(tester2, [traces[1]], layout, config);
            Plotly.newPlot(tester3, [traces[2]], layout, config);

            console.log("[wykres.js] Charts created successfully.");

            // TABLE TERRITORY STARTS HERE
            // JavaScript for strip collapsing
            const toggleButton = document.getElementById('toggleButton');
            const rightStrip = document.getElementById('rightStrip');
            toggleButton.addEventListener('click', () => {
                const isCollapsed = rightStrip.classList.toggle('collapsed');
                toggleButton.textContent = isCollapsed ? 'Expand' : 'Collapse';
                charts.style.marginRight = isCollapsed ? '0' : '300px'; // Adjust margin of charts dynamically
                setTimeout(() => {
                    allPlots.forEach(plot => {
                        Plotly.relayout(plot, { autosize: true });
                    });
                }, 500);
            });

            const timespanTableBody = document.getElementById('timespanTableBody');

            // Populate table with timespans
            timespans.forEach((timespan, index) => {

                // Create the regular row
                const row = document.createElement('tr');
                row.setAttribute('data-start', timespan.start_time); // Set data attributes for loading logic
                row.setAttribute('data-end', timespan.end_time);

                row.innerHTML = `
                    <td>${timespan.timespan_id}</td>
                    <td>${timespan.start_time.toFixed(2)}</td>
                    <td>${timespan.end_time.toFixed(2)}</td>
                    <td><button class="row-unfold square dark-theme">+</button></td>
                `;
                timespanTableBody.appendChild(row);

                // Create the unfolded content row (hidden by default)
                const unfoldedRow = document.createElement('tr');
                unfoldedRow.classList.add('unfolded-content');
                unfoldedRow.setAttribute('data-timespan-id', timespan.timespan_id)
                unfoldedRow.style.display = 'none'; // Hidden by default
                unfoldedRow.style.display = index === 0 ? 'table-row' : 'none'; // Unfold the first row by default
                unfoldedRow.innerHTML = `
                    <td colspan="4">
                        <p>${timespan.model_proposition}</p>
                        <div >
                            <button class="button toggle-button grey-theme vote-accurate" data_vote="true" button-number="1">Cardiomyopathic</button>
                            <button class="button toggle-button grey-theme vote-inaccurate" data_vote="false" button-number="2">Non-cardiomyopathic</button>
                            <button class="button toggle-button grey-theme vote-comment" data_vote="false" button-number="3">Don't know / other</button>
                        </div>
                        <p class='comment-feedback'></p>
                        <input type="text" class="unfolded-text comment-feedback" placeholder="Enter text here">
                        <button class="submit-vote button dark-theme">Submit</button>
                    </td>
                `;
                timespanTableBody.appendChild(unfoldedRow);

                // Pre-fill data for timespans

                if (timespan.user_vote !== undefined && timespan.button_number !== undefined) {
                    const row = document.querySelector(`[data-timespan-id="${timespan.timespan_id}"]`);
                    if (row) {
                        // Pre-fill vote button based on button_number
                        const buttonToHighlight = unfoldedRow.querySelector(`.toggle-button[button-number="${timespan.button_number}"]`);
                        if (buttonToHighlight) {
                            buttonToHighlight.classList.remove('grey-theme');
                            buttonToHighlight.classList.add('light-theme');
                        } else {
                            console.error(`[Pre-fill] Button not found for button_number: ${timespan.button_number}`);
                        }
                        // Pre-fill the comment box
                        const commentBox = row.querySelector('.unfolded-text.comment-feedback');
                        if (commentBox) {
                            commentBox.value = timespan.user_comment || '';
                        } else {
                            console.warn(`[Pre-fill] Comment box not found for timespan ID: ${timespan.timespan_id}`);
                        }
                    } else {
                        console.warn(`[Pre-fill] Row not found for timespan ID: ${timespan.timespan_id}`);
                    }
                } else {
                    console.warn(`[Pre-fill] Missing user_vote or button_number for timespan ID: ${timespan.timespan_id}`);
                }
                
                // Handle row unfold action (toggle + to - and show/hide content)
                const unfoldButton = row.querySelector('.row-unfold');
                if (index === 0) { // Disable the button for the first row by default
                    unfoldButton.textContent = ' ';
                    unfoldButton.disabled = true;}
                unfoldButton.addEventListener('click', () => {
                    const isUnfolded = unfoldedRow.style.display === 'table-row';
                    unfoldedRow.style.display = isUnfolded ? 'none' : 'table-row';
                    unfoldButton.textContent = isUnfolded ? '+' : ' ';

                    // Close other unfolded rows
                    document.querySelectorAll('.unfolded-content').forEach(otherRow => {
                        if (otherRow !== unfoldedRow) {
                            otherRow.style.display = 'none';
                            const siblingButton = otherRow.previousElementSibling.querySelector('.row-unfold');
                            if (siblingButton) {
                                siblingButton.textContent = '+'; 
                                siblingButton.disabled = false; // Enable the button for other rows
                            }
                        }
                    unfoldButton.disabled = !isUnfolded; // Disable the button for currently unfolded row
                    });
                });
                // Selecting vote
                unfoldedRow.querySelectorAll('.toggle-button').forEach(button => {
                    button.addEventListener('click', () => {
                        // Set all buttons in the current unfolded row to grey theme
                        unfoldedRow.querySelectorAll('.toggle-button').forEach(b => {
                            b.classList.remove('dark-theme'); // Remove dark theme
                            b.classList.add('grey-theme');   // Apply grey theme
                            b.setAttribute('data-toggle', 'false'); // Reset data-toggle
                            // b.setAttribute('data-vote', 'false');  // [BUG] pointless code, remove if for a couple versions nothing breaks
                            console.log('[wykres.js][.toggle-button] Changed buttons to grey.');
                        });
                
                        // Set clicked button to dark theme
                        button.classList.remove('grey-theme');
                        button.classList.add('dark-theme');
                        button.setAttribute('data-toggle', 'true'); // Mark as active
                        // button.setAttribute('data-vote', 'true'); // [BUG] pointless code, remove if for a couple versions nothing breaks
                        console.log('[wykres.js][.toggle-button] Changed active button to dark.');
                    });
                });
                // Submitting vote 
                unfoldedRow.querySelector('.submit-vote').addEventListener('click', () => {
                    const activeButton = unfoldedRow.querySelector('.toggle-button.dark-theme');
                    const commentField = unfoldedRow.querySelector('.unfolded-text');
                    const comment = commentField.value.trim();
                    const feedbackText = unfoldedRow.querySelector('.comment-feedback');
                
                    // Ensure an active button is selected
                    if (!activeButton) {
                        feedbackText.textContent = 'Please select a vote option.';
                        console.log('[wykres.js][submit-vote] Option not selected.');
                        return;
                    }
                
                    // Check if a comment is required
                    const requiresComment = !activeButton.classList.contains('vote-accurate'); // Button 1 does not require a comment
                    if (requiresComment && comment === '') {
                        feedbackText.textContent = 'Comment is required for this option.';
                        console.log('[wykres.js][submit-vote] Required comment not submitted.');
                        commentField.classList.add('error');
                        return;
                    }
                
                    // Clear feedback and error styling
                    feedbackText.textContent = '';
                    commentField.classList.remove('error');

                    console.log('[wykres.js][submit-vote] user_vote raw :', activeButton.getAttribute('data-vote')) 
                    console.log('[wykres.js][submit-vote] user_vote tried :', activeButton.getAttribute('data-vote') === 'true') 
                    // Gather payload
                    const payload = {
                        timespan_id: unfoldedRow.getAttribute('data-timespan-id'),
                        user_vote: activeButton.getAttribute('data-vote') === 'true',
                        button_number: activeButton.getAttribute('button-number'),
                        user_comment: comment,
                        chart_id : chartId
                    };
                    console.log('[wykres.js][submit-vote] Payload button-number : ', activeButton.getAttribute('button-number')) // [DEBUG] 
                
                    // Submit vote via fetch
                    fetch('/api/submit_vote', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(response => {
                        if (response.ok) {
                            feedbackText.textContent = 'Vote submitted successfully!';
                        } else {
                            alert('Error submitting vote! Administrator has been notified. In the meanwhile : Please report it at the bottom of the page. ');
                        }
                    });
                });                

                
            });

            // JavaScript for table collapsing
            const rowToggleButtons = document.querySelectorAll('.row-toggle');

            rowToggleButtons.forEach((button, index) => {
                button.addEventListener('click', () => {
                    console.log(`[wykres.js][rowToggleButtons] Toggle button clicked for table ${index + 1}`);
                    const rowContainer = button.closest('table').querySelector('.row-container');
                    if (rowContainer) {
                        const isCollapsed = rowContainer.classList.toggle('collapsed');
                        console.log(`[wykres.js][rowToggleButtons] Row container collapsed state for table ${index + 1}:`, isCollapsed);
                        button.textContent = isCollapsed ? '+' : '-';
                    } else {
                        console.error(`[wykres.js][rowToggleButtons] No row-container found for table ${index + 1}`);
                    }
                });
            });

            // Add event listeners to load buttons for timespans
            document.querySelectorAll('.row-unfold').forEach(button => {
                button.addEventListener('click', function () {
                    const currentRow = this.closest('tr');
                    const start = parseFloat(currentRow.dataset.start);
                    const end = parseFloat(currentRow.dataset.end);

                    if (isNaN(start) || isNaN(end)) {
                        console.error("[wykres.js] Start or end timespan data is invalid:", { start, end });
                        return;
                    }

                    const extendedStart = Math.max(xMin, start - 15) // Add buffer
                    const extendedEnd = Math.min(xMax, end + 15); // Add buffer

                    console.log(`[wykres.js][.row-unfold] Loading timespan: ${extendedStart} to ${extendedEnd}`);

                    // Update plots
                    allPlots.forEach(plot => {
                        Plotly.relayout(plot, {
                            'xaxis.range': [extendedStart, extendedEnd],
                            'xaxis.rangeslider.range': [extendedStart, extendedEnd]
                        });
                    });

                    // Update shapes
                    shapes_coordinates = { x0: start, x1: end };
                    console.log('[wykres.js] Updated shapes_coordinates:', shapes_coordinates);

                    allPlots.forEach(plot => {
                        Plotly.relayout(plot, {
                            shapes: [{
                                type: 'rect',
                                xref: 'x',
                                yref: 'paper',
                                x0: shapes_coordinates.x0,
                                x1: shapes_coordinates.x1,
                                y0: 0,
                                y1: 1,
                                fillcolor: 'rgba(255,0,0, 0.2)',
                                line: { width: 0 }
                            }]
                        });
                    });

                    fetch(`/api/chart_data?chart_id=${chartId}&start_time=${start}&end_time=${end}`)
                        .then(response => {
                            if (!response.ok) throw new Error(`Error fetching chart data: ${response.statusText}`);
                            return response.json();
                        })
                        .then(chartData => {
                            const ecgData = chartData.ECG;
                            const updatedData = [
                                { x: ecgData.time, y: ecgData.ch1, name: 'Channel 1', line: { color: '#000000', width: 1 } },
                                { x: ecgData.time, y: ecgData.ch2, name: 'Channel 2', line: { color: '#000000', width: 1 } },
                                { x: ecgData.time, y: ecgData.ch3, name: 'Channel 3', line: { color: '#000000', width: 1 } }
                            ];

                            allPlots.forEach((plot, idx) => {
                                Plotly.react(plot, [updatedData[idx]], layout);
                            });
                        })
                        .catch(error => console.error('[wykres.js] Error fetching or updating chart data:', error));
                });
            });

            console.log("[wykres.js][table] Timespan table populated and event listeners for load buttons added");
            
            // Voting subterritory       

            // SYNCHRONISATION TERRITORY STARTS HERE
            // Debounce function to limit the frequency of updates
            function debounce(func, wait) {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), wait);
                };
            }

            let isUpdating = false;
            let isSliderUpdating = false;

            // Function to enforce data bounds
            function enforceDataBounds(eventdata, plot) {
                if ('xaxis.range[0]' in eventdata && 'xaxis.range[1]' in eventdata) {
                    const newRange = [
                        Math.max(xMin, eventdata['xaxis.range[0]']),
                        Math.min(xMax, eventdata['xaxis.range[1]'])
                    ];
                    
                    if (newRange[0] !== eventdata['xaxis.range[0]'] || 
                        newRange[1] !== eventdata['xaxis.range[1]']) {
                        Plotly.relayout(plot, {
                            'xaxis.range': newRange
                        });
                        return true;
                    }
                }
                return false;
            }

            // Function to synchronize plots (including sliders)
            const syncPlots = debounce((eventdata, triggerPlot) => {
                if (isUpdating || isSliderUpdating) return;
                isUpdating = true;

                console.log("[wykres.js][syncPlots] Sync function called.", eventdata);

                const updatedLayout = {};

                if ('xaxis.range[0]' in eventdata && 'xaxis.range[1]' in eventdata) {
                    updatedLayout['xaxis.range'] = [
                        Math.max(xMin, eventdata['xaxis.range[0]']),
                        Math.min(xMax, eventdata['xaxis.range[1]'])
                    ];
                    console.log(`[wykres.js][syncPlots] Syncing xaxis.range: ${updatedLayout['xaxis.range']}`);
                } else if (Array.isArray(eventdata['xaxis.range'])) { 
                    updatedLayout['xaxis.range'] = [
                        Math.max(xMin, eventdata['xaxis.range'][0]),
                        Math.min(xMax, eventdata['xaxis.range'][1])
                    ];
                    console.log(`[wykres.js][syncPlots] Syncing xaxis.range (slider): ${updatedLayout['xaxis.range']}`);
                } else if ('xaxis.autorange' in eventdata) {
                    updatedLayout['xaxis.autorange'] = eventdata['xaxis.autorange'];
                    console.log(`[wykres.js][syncPlots] Syncing xaxis.autorange: ${updatedLayout['xaxis.autorange']}`);
                }

                if (Object.keys(updatedLayout).length === 0) {
                    console.log("[wykres.js][syncPlots] No recognizable range data in event", eventdata);
                    isUpdating = false;
                    return;
                }

                const updatePromises = allPlots
                    .filter(plot => plot !== triggerPlot)
                    .map(plot => {
                        console.log("[wykres.js][syncPlots] Updating plot", plot.id, "with layout", updatedLayout);
                        return Plotly.relayout(plot, updatedLayout);
                    });

                Promise.all(updatePromises).then(() => {
                    isUpdating = false;
                });

                // Ensure sliders are synced
                allPlots.forEach(plot => {
                    Plotly.relayout(plot, { 'xaxis.range': updatedLayout['xaxis.range'] });
                });
            }, 100);

            // Add event listeners to each plot
            allPlots.forEach(plot => {
                plot.on('plotly_relayout', function(eventdata) {
                    console.log("[wykres.js][syncPlots] Relayout event on", plot.id, eventdata);
                    if (!('autosize' in eventdata) && !isUpdating && !isSliderUpdating) {
                        if (!enforceDataBounds(eventdata, plot)) {
                            syncPlots(eventdata, plot);
                        }
                    }
                });
            });

            console.log('[wykres.js][syncPlots] Event listeners for synchronisation added.');
        })
        .catch(error => {
            console.error('[wykres.js] Error fetching or parsing data:', error);
        });
});