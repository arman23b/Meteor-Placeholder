import subprocess
import socket
import struct
import fcntl
import os

HCI_DEVICE = "hci0"
COMPANY_ID = "00 00"
IP_PACKET_ID = "CD CD"
IP_PACKET_END = "DE AD BE EF"


def get_ip_address(ifname):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    return socket.inet_ntoa(fcntl.ioctl(
        s.fileno(),
        0x8915,  # SIOCGIFADDR
        struct.pack('256s', ifname[:15])
    )[20:24])


# http://stackoverflow.com/questions/16151360/use-bluez-stack-as-a-peripheral-advertiser
# http://stackoverflow.com/questions/18906988/what-is-the-ibeacon-bluetooth-profile
# https://github.com/RadiusNetworks/altbeacon-reference/blob/master/altbeacon_transmit
# TODO: remember to change numbers to hex string
# TODO: add or remove spaces from uuid
"""
sudo hciconfig hci0 down
sudo hciconfig hci0 up
sudo hciconfig hci0 noleadv
sudo hciconfig hci0 noscan
sudo hciconfig hci0 leadv
sudo hcitool -i hci0 cmd 0x08 0x0008 1e 02 01 1a 1a ff 4c 00 02 15 e2 c5 6d b5 df fb 48 d2 b0 60 d0 f5 a7 10 96 e0 00 00 00 00 c5 00
sudo hcitool -i hci0 cmd 0x08 0x0008 1e 02 01 06 1a ff 4c 00 02 15 33 33 33 33 33 33 33 33 33 33 33 33 33 33 33 33 00 00 00 00 c5 00
length (1e) is length of packet. there is a trailing 00 at the end
the 1a doesn't seem to matter even though it's supposed to denote length of some sort...
"""
ip = get_ip_address('wlan0')
formatted_ip = ""
for i in xrange(0, len(ip)):
    formatted_ip += hex(ord(ip[i])) + " "
formatted_ip = formatted_ip.strip()
"""
14 comes from: 9 bytes of packet header
               4 bytes of packet end
               1 byte of transmission power
"""
packet_len = 14 + len(ip)
packet_format = "02 01 06 {} FF {} {} {} {} c5 00"
packet = packet_format.format(str(hex(packet_len-4))[2:],
                              COMPANY_ID,
                              IP_PACKET_ID,
                              formatted_ip,
                              IP_PACKET_END)
stopargs = "sudo hciconfig {} noleadv".format(HCI_DEVICE).split(" ")
bcargs = "sudo hcitool -i {} cmd 0x08 0x0008 {} {}".format(HCI_DEVICE,
                                                           str(hex(packet_len))[2:],
                                                           packet) \
                                                   .split(" ")
startargs = "sudo hciconfig {} leadv".format(HCI_DEVICE).split(" ")
devnull = open(os.devnull, 'wb')
subprocess.Popen(stopargs, stdin=subprocess.PIPE, stdout=devnull)
subprocess.Popen(bcargs, stdin=subprocess.PIPE, stdout=devnull)
subprocess.Popen(startargs, stdin=subprocess.PIPE, stdout=devnull)
