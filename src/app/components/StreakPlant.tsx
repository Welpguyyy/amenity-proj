import React from 'react';
import Image from 'next/image';

// Map plant stages to image filenames
const stageToImage: Record<number, string> = {
  1: '/images/StreakPlantImages/Stage 1 Normal.gif', //placeholder for 3 hp left (full hp)
  2: '/images/StreakPlantImages/Stage 2 to Stage 1.gif', //placeholder for 2 hp left
  3: '/images/StreakPlantImages/Stage 3 to Stage 2.gif', //placeholder for 1 hp left
  4: '/images/StreakPlantImages/Stage 4 to Stage 3.gif', //placeholder for 0 hp left
};

interface StreakPlantProps {
  stage: 1 | 2 | 3 | 4;
  className?: string;
}

const StreakPlant: React.FC<StreakPlantProps> = ({ stage, className }) => {
  const src = stageToImage[stage] || stageToImage[4];
  return (
    <div
      className={className}
      style={{
          width: '10rem',
          height: '19rem',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          marginTop: 'auto',
          position: 'relative',
          zIndex: 3,
      }}
    >
      <Image
        src={src}
        alt={`Streak Plant Stage ${stage}`}
        width={128}
        height={192}
        style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }}
        priority
      />
    </div>
  );
};

export default StreakPlant; 