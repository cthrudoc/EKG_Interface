import json
import h5py
import numpy as np

def convert_ecg_to_h5(txt_path, h5_path):
    print("Starting conversion...")
    
    with open(txt_path) as f:
        total_lines = sum(1 for _ in f) - 4
    print(f"Found {total_lines} data points to process")
    
    print("Loading data from txt file...")
    data = np.loadtxt(txt_path, skiprows=4)
    print("Data loaded successfully!")
    
    print("Creating HDF5 file...")
    with h5py.File(h5_path, 'w') as f:
        names = ['time', 'ch1', 'ch2', 'ch3']
        for i, name in enumerate(names):
            print(f"Writing {name} dataset...")
            f.create_dataset(name, data=data[:, i], chunks=True)
    
    print("Conversion complete!")

convert_ecg_to_h5("TestEKG.txt", "TestEKG_converted.h5")  # Added .h5 extension

"""
ECG1 = { 
    'RecordStart' : '08:10', 
    'Duration' : 1300, 
    'ECG' : {
        'time': [] ,
        'ch1': [] ,
        'ch2': [] ,
        'ch3': [] ,
}}

with open('testEKG.txt', 'r+', encoding="utf-8") as f:
    for l in f:
        v=l.split()
        ECG1['ECG']['time'].append(float(v[0]))
        ECG1['ECG']['ch1'].append(float(v[1]))
        ECG1['ECG']['ch2'].append(float(v[2]))
        ECG1['ECG']['ch3'].append(float(v[3]))
        print(v)

with open('testEKG.json', 'w', encoding="utf-8") as f:
    json.dump(ECG1, f, indent=4)
"""