document.addEventListener('DOMContentLoaded', function() {
    const tester1 = document.getElementById('tester1');
    const tester2 = document.getElementById('tester2');
    const tester3 = document.getElementById('tester3');
    const allPlots = [tester1, tester2, tester3];

    fetch('/api/ecg/1')
        .then(response => response.json())
        .then(data => {
            const ecgData = data.ECG;
            
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
                shapes: [
                    {
                        type: 'rect',
                        xref: 'paper',
                        yref: 'paper',
                        x0: 0,
                        y0: 0,
                        x1: 1,
                        y1: 1,
                        fillcolor: 'transparent',
                        line: {
                            width: 1,
                            color: '#FF0000'
                        }
                    },
                    {
                        type: 'rect',
                        x0: 130.0,
                        x1: 135.0,
                        y0: 0, 
                        y1: 1,
                        yref: 'paper',
                        fillcolor: 'rgba(255, 0, 0, 0.15)', 
                        line: { width: 0 }
                    }
                ],
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