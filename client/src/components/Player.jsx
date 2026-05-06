import React, { useRef, useEffect, useState } from 'react';

const Player = ({ track }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress]   = useState(0);

  const streamUrl = `/api/stream/${track.id}`;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [track]);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    const { duration, currentTime } = audioRef.current;
    if (duration) setProgress((currentTime / duration) * 100);
  };

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
  };

  return (
    <div className="player-bar">
      {/* Track info */}
      <div className="player-track-info">
        <div className="player-art">💩</div>
        <div>
          <div className="player-track-title">{track.title}</div>
          <div className="player-track-artist">{track.artist}</div>
        </div>
      </div>

      {/* Controls + seek */}
      <div className="player-controls">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={progress || 0}
          onChange={handleSeek}
          className="seek-bar"
        />
      </div>

      {/* Spacer */}
      <div className="player-spacer" />

      <audio
        ref={audioRef}
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default Player;
