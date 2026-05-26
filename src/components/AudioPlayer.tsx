interface Props {
  src: string;
}

export function AudioPlayer({ src }: Props) {
  return (
    <div className="audio-player">
      <audio className="audio-player__native" controls preload="metadata" src={src}>
        O seu browser não suporta reprodução de áudio.
      </audio>
      <p className="audio-player__hint">Ouvir gravação enviada</p>
    </div>
  );
}
