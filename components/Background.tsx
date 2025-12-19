import React from 'react';

const Background: React.FC = () => {
  return (
    <>
      <div className="bg-image-container">
        <img src="/desktop--background.jpeg" alt="Desktop background" className="bg-image bg-image-desktop" />
        <img src="/mobile-background.jpeg" alt="Mobile background" className="bg-image bg-image-mobile" />
      </div>
    </>
  );
};

export default React.memo(Background);
