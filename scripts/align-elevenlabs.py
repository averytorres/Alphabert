import os
"""Local-only timing aid. ASR output is not pronunciation approval."""
import sys, pathlib, json, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'tools/audio-python'))
from faster_whisper import WhisperModel
import numpy as np
model = WhisperModel('small.en', device='cpu', compute_type='int8', download_root=str(root / '.elevenlabs-cache/models'))
for name in sys.argv[1:]:
    path = root / 'audio-trials/elevenlabs' / name
    pcm = subprocess.check_output([os.environ.get('FFMPEG_PATH') or str(root / 'tools/audio/node_modules/ffmpeg-static' / ('ffmpeg.exe' if os.name=='nt' else 'ffmpeg')), '-v', 'error', '-i', str(path), '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'])
    audio = np.frombuffer(pcm, dtype=np.float32)
    segments, info = model.transcribe(audio, language='en', word_timestamps=True, beam_size=5, vad_filter=False)
    result = [dict(start=s.start,end=s.end,text=s.text,words=[dict(start=w.start,end=w.end,text=w.word,probability=w.probability) for w in s.words]) for s in segments]
    path.with_suffix('.timings.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(name, 'aligned', flush=True)
