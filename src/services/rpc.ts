import { API_BASE } from '@/constants'
import { uuidv4 } from '@/utils/uuid'
import Base64 from '@/utils/base64'

/*
[{"streamKey":"b45b5cc2-21f9-4c99-94c2-3e0ceef2505a","firstSeenEpoch":1750868475,"audioPacketsReceived":0,"videoStreams":[],"whepSessions":[]}]
*/
const constraints = {
  audio: true,
  video: false
}

const _AudioContext:any = (window as any).AudioContext || (window as any).webkitAudioContext
const audioCtx = new _AudioContext()
const pcS = {}

let uid = ''
let nickname = ''
let room = ''
let streamKey = ''

let onConnect = (pc:any, stream:any, analyser:any, streamId:string, uid:string, nickname:string) => {}
let onDisconnect = (streamId:string) => {}
let onError = (err:any) => {}
let onResume = (err:any) => {}

let pcP:any = null
let running:boolean = false

export function launch (_room, _nickname, _uid, _onConnect, _onDisconnect, _onResume, _onError) {
  room = _room;
  streamKey = btoa(JSON.stringify({room, id: _uid, name: _nickname}));  
  
  onConnect = _onConnect
  onDisconnect = _onDisconnect
  onResume = _onResume
  onError = _onError
  
  nickname = _nickname
  uid = _uid
 
  window.addEventListener("beforeunload", () => { stop()});
  window.addEventListener("unload", () => { stop()});
  
  running = true
  start()
}

export function stop () {
  if (pcP) {pcP.close()}
  for (let key of Object.getOwnPropertyNames(pcS)) {pcS[key].pc.close()}
  
  running = false
  console.debug('stop: ' + running)
}

function detectSilence(analyser) {
   if (!analyser) return true;
   
   const bufferLength = analyser.frequencyBinCount;
   const dataArray = new Float32Array(bufferLength);
   analyser.getFloatFrequencyData(dataArray);	
   let isSilence = true;
   
   for (let i = 0; i < bufferLength; i++) {
	   if (dataArray[i] > -100) {
		   isSilence = false;
		   break;
	   }
   }
   return isSilence;
}

async function subscribe () {	
    const statusURL = "https://pade.chat:5443/orinayo/api/status";	  	  
	const resp = await fetch(statusURL);
	const streams = await resp.json();

    for (let stream of streams) {
		//console.debug("scanning stream", stream, pcS[stream.streamKey]);
		const key = JSON.parse(atob(stream.streamKey));
		
		if (room != key.room) continue;		
		if (streamKey == stream.streamKey) continue;		
		
		if (pcS[stream.streamKey] && detectSilence(pcS[stream.streamKey].analyser)) {
			console.debug('stale', pcS[stream.streamKey])			
			
			if (onDisconnect) {
			  onDisconnect(key.id)
			  pcS[stream.streamKey].pc.close()
			  delete pcS[stream.streamKey]
			  continue;
			}			
		}
		
		if (pcS[stream.streamKey]) continue;

		pcS[stream.streamKey] = {pc: new RTCPeerConnection(), key, id: stream.streamKey};
	
		pcS[stream.streamKey].pc.ontrack = (event) => {
		  const key = pcS[stream.streamKey].key;
		  const pc = pcS[stream.streamKey].pc;
		  
		  console.debug('ontrack', event, key, pc);

		  for (let ms of event.streams) {
			  if (!ms) continue;
			  
			  const analyser = audioCtx.createAnalyser();
			  analyser.fftSize = 256;
			  analyser.minDecibels = -80;
			  analyser.maxDecibels = -10;
			  analyser.smoothingTimeConstant = 0.85;
			  const source = audioCtx.createMediaStreamSource(ms)
			  source.connect(analyser)

			  if (onConnect) {
				onConnect(pc, ms, analyser, key.id, key.id, key.name)
				pcS[stream.streamKey].analyser = analyser;
			  }
		  }
		}		

		pcS[stream.streamKey].pc.addTransceiver('audio', { direction: 'recvonly' })					
		const offer = await pcS[stream.streamKey].pc.createOffer();
		await pcS[stream.streamKey].pc.setLocalDescription(offer)
		
		const whepUrl = "https://pade.chat:5443/orinayo/api/whep"
		const resp = await fetch(whepUrl, {method: 'POST', body: offer.sdp, headers: {Authorization: `Bearer ${stream.streamKey}`, 'Content-Type': 'application/sdp'}});
		const answer = await resp.text();
		await pcS[stream.streamKey].pc.setRemoteDescription({sdp: answer,  type: 'answer'});				
	}		
	  
    setTimeout(() => {subscribe()}, 5000);
}

export async function start () {
  if (!running) {
    return
  }

  try {
    document.querySelectorAll('.peer').forEach((el:any) => el.remove())
    pcP = new RTCPeerConnection();	
    let stream;
	
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      // document.getElementById('microphone').style.display = 'block'
      console.error(err)
      if (onError) {
        onError(err)
      }
      return
    }
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    analyser.minDecibels = -80
    analyser.maxDecibels = -10
    analyser.smoothingTimeConstant = 0.85
    const source = audioCtx.createMediaStreamSource(stream)
    const gainNode = audioCtx.createGain()
    // Reduce micphone's volume to 0.01 (not 0)
    // or safari will give non-sense data in getFloatFrequencyData() and getByteTimeDomainData()
    // after switch mornin's tab to background
    gainNode.gain.value = 0.01
    source.connect(analyser)
    analyser.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    if (onConnect) {
      onConnect(pcP, stream, analyser, "me", uid, nickname)
    }

    audioCtx.resume()

    stream.getTracks().forEach((track) => {  
		if (track.kind === 'audio') {
		  pcP.addTransceiver(track, {direction: 'sendonly'})
		}	  
    })

	const offer = await pcP.createOffer();
	pcP.setLocalDescription(offer)
	
	const whipUrl = "https://pade.chat:5443/orinayo/api/whip"
	const resp = await fetch(whipUrl, {method: 'POST', body: offer.sdp, headers: {Authorization: `Bearer ${streamKey}`, 'Content-Type': 'application/sdp'}});
	const answer = await resp.text();
	pcP.setRemoteDescription({sdp: answer,  type: 'answer'});
    subscribe()	

  } catch (err) {
    if (onError) {
      onError(err)
    }
  }
}
