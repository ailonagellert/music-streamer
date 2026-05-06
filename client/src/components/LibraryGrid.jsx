import React from 'react';

const LibraryGrid = ({ tracks, onPlayTrack, onDeleteTrack }) => {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="library-empty">
        <span className="empty-icon">💩</span>
        <p className="empty-msg">Your library is empty.</p>
        <p className="empty-sub">Upload music to get started!</p>
      </div>
    );
  }

  return (
    <div className="library-grid">
      {tracks.map((track) => (
        <div
          key={track.id}
          className="track-card"
          onClick={() => onPlayTrack(track)}
          title={`${track.title} — ${track.artist}`}
        >
          <button
            className="track-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete "${track.title}"?`)) {
                onDeleteTrack(track.id);
              }
            }}
            title="Delete track"
          >
            ✕
          </button>
          <div className="track-art">
            <span className="icon-idle">💩</span>
            <span className="icon-play">▶️</span>
          </div>
          <div className="track-title">{track.title}</div>
          <div className="track-artist">{track.artist}</div>
        </div>
      ))}
    </div>
  );
};

export default LibraryGrid;
