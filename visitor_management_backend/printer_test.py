import win32com.client

wia = win32com.client.Dispatch("WIA.DeviceManager")
device_infos = wia.DeviceInfos

print(f"Devices found: {device_infos.Count}")

for device_info in device_infos:
    # Iterate properties instead of subscripting
    for prop in device_info.Properties:
        print(f"  → {prop.Name}: {prop.Value}")
    print("---")