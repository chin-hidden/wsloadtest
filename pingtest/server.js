/**
 * The test server. Response to ping messages from the real client and send
 * garbage data to swarm clients.
 */

var sockjs = require('sockjs');
var http = require('http');
var util = require('util');
var argv = require('yargs').argv;


var PORT = argv.port || 8080;
var RATE = argv.rate || 75; // msg/second
var server = http.createServer();

var sockjs_opts = {sockjs_url: "http://cdn.jsdelivr.net/sockjs/0.3.4/sockjs.min.js"};
var sock_server = sockjs.createServer(sockjs_opts);


server.addListener('upgrade', function(req,res) {
    res.end();
});


sock_server.on("connection", (conn) => {
    var counter = 0;
    var stocks = ['AAA','ACB','ADC','ALT','ALV','AMC','AME','AMV','APG','API','APP','APS','ARM','ASA','B82','BAM','BBS','BCC','BDB','BED','BHT','BII','BKC','BLF','BPC','BSC','BST','BTS','BVS','BXH','C92','CAN','CAP','CCM','CEO','CID','CJC','CKV','CMC','CMI','CMS','CPC','CSC','CT6','CTA','CTB','CTC','CTN','CTS','CTX','CVN','CVT','CX8','D11','DAC','DAD','DAE','DBC','DBT','DC2','DC4','DCS','DGC','DHP','DHT','DID','DIH','DL1','DLR','DNC','DNM','DNP','DNY','DPC','DST','DXP','DZM','EBS','ECI','EFI','EID','FDT','FIT','GGG','GLT','GMX','HAD','HAT','HBE','HBS','HCC','HCT','HDA','HDO','HEV','HGM','HHC','HHG','HJS','HLC','HLD','HLY','HMH','HNM','HOM','HPC','HPS','HST','HTC','HTP','HUT','HVT','ICG','IDJ','IDV','INC','INN','ITQ','IVS','KHB','KHL','KKC','KLF','KLS','KMT','KSD','KSK','KSQ','KST','KTS','KTT','L14','L18','L35','L43','L44','L61','L62','LAS','LBE','LCD','LCS','LDP','LHC','LIG','LM3','LM7','LO5','LTC','LUT','MAC','MCC','MCF','MCO','MDC','MEC','MHL','MIM','MKV','MMC','MNC','NAG','NBC','NBP','NDF','NDN','NDX','NET','NFC','NGC','NHA','NHC','NPS','NST','NTP','NVB','OCH','ONE','ORS','PCG','PCT','PDC','PEN','PFL','PGS','PGT','PHC','PID','PIV','PJC','PLC','PMC','PMS','POT','PPE','PPG','PPP','PPS','PRC','PSC','PSD','PSI','PTI','PTM','PTS','PV2','PVA','PVB','PVC','PVE','PVG','PVI','PVL','PVR','PVS','PVV','PVX','PXA','QCC','QHD','QNC','QST','QTC','RCL','S12','S55','S74','S91','S96','S99','SAF','SAP','SCJ','SCL','SCR','SD1','SD2','SD4','SD5','SD6','SD7','SD9','SDA','SDB','SDC','SDD','SDE','SDG','SDH','SDN','SDP','SDT','SDU','SDY','SEB','SED','SFN','SGC','SGD','SGH','SHA','SHB','SHN','SHS','SIC','SJ1','SJC','SJE','SJM','SLS','SMT','SPI','SPP','SQC','SRA','SRB','SSG','SSM','STC','STL','STP','SVN','TAG','TBX','TC6','TCS','TCT','TDN','TET','TH1','THB','THS','THT','TIG','TJC','TKC','TKU','TMC','TMX','TNG','TPH','TPP','TSB','TST','TTC','TTZ','TV2','TV3','TV4','TVC','TVD','TXM','UNI','V12','V15','V21','VAT','VBC','VBH','VC1','VC2','VC3','VC5','VC6','VC7','VC9','VCC','VCG','VCM','VCR','VCS','VDL','VDS','VE1','VE2','VE3','VE4','VE8','VE9','VFR','VGP','VGS','VHH','VHL','VIE','VIG','VIT','VIX','VKC','VLA','VMC','VMI','VNC','VND','VNF','VNN','VNR','VNT','VPC','VTC','VTH','VTL','VTS','VTV','VXB','WCS','WSS','YBC','PHP','PMP','PSW','HVA','SMN','TTB','CTT','HKB','DPS','KVC','PCE','PDB','E1SSHN30','ACM','NHP','PBP','PSE','TA9','DP3','FID','G20','PMB'];
    var stockIndex = 0;
    var intervalHandle;

    conn.on("data", (msg) => {
        msg = JSON.parse(msg);
        var type = msg.type,
            payload = msg.payload;

        if (type === "ping") {
            send(conn, {type: "pong", payload});
        } else if (type === "gameon") {
            intervalHandle = setInterval(() => {
                var stock = stocks[stockIndex];
                var data = `02|${counter + 1}|11:09:50|${stock}|CT CP CHUNG KHOAN SAI GON|S|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 2}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 4}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|${counter + 1}|`;

                send(conn, {data: data, type: 'STOCK'});
                counter++;

                stockIndex++;
                if (stockIndex == stocks.length) {
                    stockIndex = 0;
                }
            }, 1000 / RATE);
        } else if (type === "stop") {
            clearInterval(intervalHandle);
        }
    });

    conn.on("close", () => {
        console.log("closed");
        clearInterval(intervalHandle);
    });
});

function send(conn, data) {
    conn.write(JSON.stringify(data));
}

sock_server.installHandlers(server, {prefix:'/realtime'});

server.listen(PORT, '0.0.0.0');
