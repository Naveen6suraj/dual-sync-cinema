import React from 'react';
import CinemaRoom from '@/components/CinemaRoom';

export default function Home() {
  return (
    <main className="h-screen w-screen bg-[#050508] text-white overflow-hidden">
      <CinemaRoom 
        roomId="nexus-prime" 
        // eslint-disable-next-line react-hooks/purity
        userId={`user_${Math.floor(Math.random() * 10000)}`} 
        userName="Host" 
        isHost={true} 
      />
    </main>
  );
}
