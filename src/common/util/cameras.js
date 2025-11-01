const url = 'https://jimi-iothub-instruct-api.fleetmap.io/api/device/sendInstruct'
const videoIP = 'jimi-iothub.fleetmap.io'
const videoTCPPort = '10002'
export const startStreaming = (imei, proNo=37121, channel) => sendCommand(imei, proNo,
    proNo === 37121 ?
    {
        dataType: 0,
        codeStreamType: 1,
        channel,
        videoIP,
        videoTCPPort,
        videoUDPPort: 0
    } : 'RTMP,ON,INOUT' )

const sendCommand = (imei, proNo, cmdContent) => {
    const params = new URLSearchParams()
    params.append('deviceImei', imei)
    params.append('imei', imei)
    params.append('proNo', proNo)
    params.append('serverFlagId', '1')
    params.append('cmdType', 'normallns')
    params.append('requestId', '6')
    params.append('platform', 'web')
    params.append('token', 'a12341234123')
    params.append('cmdContent', proNo === 37121 ? JSON.stringify(cmdContent) : cmdContent)
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    })
}
