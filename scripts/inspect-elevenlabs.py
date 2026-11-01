import pathlib, subprocess, numpy as np
from PIL import Image, ImageDraw
root=pathlib.Path(__file__).resolve().parent.parent
ffmpeg=str(root/'tools/audio/node_modules/ffmpeg-static/ffmpeg.exe')
def audio(name):
    return np.frombuffer(subprocess.check_output([ffmpeg,'-v','error','-i',str(root/'audio-trials/elevenlabs'/name),'-ar','16000','-ac','1','-f','f32le','-']),dtype=np.float32)
data=audio('extended-take1.mp3')
sections=[('b',46.15,46.9),('d',48.25,48.95),('goat',51.35,51.95),('k',52.35,53),('p',54.35,54.95),('t',56.3,56.95),('j',58.2,58.9),('yes',75.45,76.1),('ring',83.9,84.5),('queen',85.8,86.45),('box',87.8,88.5),('alphabet',115.4,128.6)]
im=Image.new('RGB',(1400,len(sections)*150),'white');draw=ImageDraw.Draw(im)
for row,(label,start,end) in enumerate(sections):
    x=data[int(start*16000):int(end*16000)];hop=40;size=256
    frames=np.array([x[i:i+size]*np.hanning(size) for i in range(0,len(x)-size,hop)])
    db=20*np.log10(np.maximum(abs(np.fft.rfft(frames)),1e-5)); db=np.clip((db+55)/65,0,1)
    arr=np.uint8((1-db.T[::-1])*255)
    panel=Image.fromarray(arr).resize((1300,110))
    im.paste(panel,(85,row*150+20));draw.text((3,row*150+25),label,fill='black')
    for i in range(14):
        t=start+(end-start)*i/13;xx=85+i*100
        draw.text((xx,row*150+132),f'{t:.3f}',fill='black');draw.line((xx,row*150+20,xx,row*150+130),fill='#cccccc')
im.save(root/'.elevenlabs-cache/boundaries.png')
