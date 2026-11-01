import os
"""Local transcription of complete narration sources; never edits audio."""
import sys,json,pathlib,subprocess,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'tools/audio-python'))
from faster_whisper import WhisperModel
import numpy as np
model=WhisperModel('small.en',device='cpu',compute_type='int8',download_root=str(root/'.elevenlabs-cache/models'))
job_path=(root/sys.argv[1]) if len(sys.argv)>1 else root/'audio-trials/elevenlabs/app-instruction-audit.json'
jobs=json.loads(job_path.read_text(encoding='utf-8'))
results=[]
for j in jobs:
 p=root/j['file']
 if not p.exists():continue
 out=root/'audio-trials/elevenlabs'/('audit-'+j['id']+'.json')
 source_hash=hashlib.sha256(p.read_bytes()).hexdigest()
 if out.exists():
  cached=json.loads(out.read_text(encoding='utf-8'))
  if cached.get('sourceSha256')==source_hash:
   results.append(cached);continue
 pcm=subprocess.check_output([os.environ.get('FFMPEG_PATH') or str(root/'tools/audio/node_modules/ffmpeg-static'/('ffmpeg.exe' if os.name=='nt' else 'ffmpeg')),'-v','error','-i',str(p),'-ar','16000','-ac','1','-f','f32le','-'])
 segments,_=model.transcribe(np.frombuffer(pcm,dtype=np.float32),language='en',beam_size=5,vad_filter=False)
 heard=' '.join(s.text.strip() for s in segments)
 record={'key':j['key'],'expected':j['spokenText'],'heard':heard,'source':j['file'],'sourceSha256':source_hash}
 out.write_text(json.dumps(record,indent=2),encoding='utf-8');results.append(record)
 print(str(len(results))+'/'+str(len(jobs)),j['key'],flush=True)
job_path.with_name(job_path.stem+'-results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
