// Layout.jsx
import { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Layouts = ({ children }) => {
  const location = useLocation();

  const isRoomPage = location.pathname === '/';
  const isChatPage = location.pathname === '/chat';

  const roomVideoRef = useRef(null);
  const chatVideoRef = useRef(null);

  useEffect(() => {
    if (isRoomPage && roomVideoRef.current) {
      roomVideoRef.current.playbackRate = 0.9;
    }
    if (isChatPage && chatVideoRef.current) {
      chatVideoRef.current.playbackRate = 0.8;
    }
  }, [location]);
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Only show background video on Room Join page */}
      {isRoomPage && (
        <>
          <video
            ref={roomVideoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-[-1]"
            
          >
            <source src="/background_videos/room-bg2.mp4" type="video/mp4" />
          </video>
        </>
      )}



        {isChatPage && (
        <>
          <video
           ref={chatVideoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-[-1]"
          
          >
            <source src="/background_videos/chat-bg3.mp4" type="video/mp4" />
          </video>
        </>
      )}


      {/* Page content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default Layouts;
