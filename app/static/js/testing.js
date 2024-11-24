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
            console.log('[wykres.js] Timespans:', timespans); // [DEBUG]
            let chartId = data.chart_id

            // Calculate the data bounds
            const xMin = Math.min(...ecgData.time);
            const xMax = Math.max(...ecgData.time);
            
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
                    range: [xMin, xMax],
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
                    fillcolor: 'rgba(0, 255, 0, 0.2)',
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
                showlegend: true,
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

            console.log("Charts created successfully");


            // Populate the table with timespan data
            timespans.forEach((timespan, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${timespan.start_time.toFixed(2)}</td>
                    <td>${timespan.end_time.toFixed(2)}</td>
                    <td>
                        <button class="load-timespan" data-start="${timespan.start_time}" data-end="${timespan.end_time}">
                            Load
                        </button>
                    </td>
                `;
                timespanTable.appendChild(row);
            });

            // [NEW] Add event listeners to load buttons
            document.querySelectorAll('.load-timespan').forEach(button => {
                button.addEventListener('click', function() {
                    const start = parseFloat(this.dataset.start);
                    const end = parseFloat(this.dataset.end);
                    const extendedStart = Math.max(xMin, start - 0);
                    const extendedEnd = Math.min(xMax, end + 0);

                    console.log(`[wykres.js] Loading timespan: ${extendedStart} to ${extendedEnd}`);
                    
                    allPlots.forEach(plot => {
                        Plotly.relayout(plot, {
                            'xaxis.range': [extendedStart, extendedEnd]
                        });
                    });

                // Update shapes_coordinates
                shapes_coordinates = { x0: start, x1: end };
                console.log('[wykres.js] Updated shapes_coordinates:', shapes_coordinates);

                // Apply the new shape
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
                            fillcolor: 'rgba(0, 255, 0, 0.2)',
                            line: { width: 0 }
                }]
            });

            // Fetch new chart data from the API
            fetch(`/api/chart_data?chart_id=${chartId}&start_time=${start}&end_time=${end}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error fetching chart data: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(chartData => {
                    console.log('[wykres.js] New chart data received:', chartData);

                    // Update the charts with the new data
                    const ecgData = chartData.ECG;
                    const updatedData = [
                        { x: ecgData.time, y: ecgData.ch1, name: 'Channel 1' },
                        { x: ecgData.time, y: ecgData.ch2, name: 'Channel 2' },
                        { x: ecgData.time, y: ecgData.ch3, name: 'Channel 3' }
                    ];

                    allPlots.forEach((plot, idx) => {
                        Plotly.react(plot, [updatedData[idx]], layout);
                    });
                })
                .catch(error => console.error('[wykres.js] Error fetching or updating chart data:', error));

                });     
                });
                });

                console.log("Timespan table populated and event listeners added");


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

                console.log("Sync function called", eventdata);

                const updatedLayout = {};

                if ('xaxis.range[0]' in eventdata && 'xaxis.range[1]' in eventdata) {
                    updatedLayout['xaxis.range'] = [
                        Math.max(xMin, eventdata['xaxis.range[0]']),
                        Math.min(xMax, eventdata['xaxis.range[1]'])
                    ];
                    console.log(`Syncing xaxis.range: ${updatedLayout['xaxis.range']}`);
                } else if (Array.isArray(eventdata['xaxis.range'])) { 
                    updatedLayout['xaxis.range'] = [
                        Math.max(xMin, eventdata['xaxis.range'][0]),
                        Math.min(xMax, eventdata['xaxis.range'][1])
                    ];
                    console.log(`Syncing xaxis.range (slider): ${updatedLayout['xaxis.range']}`);
                } else if ('xaxis.autorange' in eventdata) {
                    updatedLayout['xaxis.autorange'] = eventdata['xaxis.autorange'];
                    console.log(`Syncing xaxis.autorange: ${updatedLayout['xaxis.autorange']}`);
                }

                if (Object.keys(updatedLayout).length === 0) {
                    console.log("No recognizable range data in event", eventdata);
                    isUpdating = false;
                    return;
                }

                const updatePromises = allPlots
                    .filter(plot => plot !== triggerPlot)
                    .map(plot => {
                        console.log("Updating plot", plot.id, "with layout", updatedLayout);
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
                    console.log("Relayout event on", plot.id, eventdata);
                    if (!('autosize' in eventdata) && !isUpdating && !isSliderUpdating) {
                        if (!enforceDataBounds(eventdata, plot)) {
                            syncPlots(eventdata, plot);
                        }
                    }
                });
            });

            console.log("Event listeners added");
        })
        .catch(error => {
            console.error('Error fetching or parsing data:', error);
        });
});