import React, { useEffect, useState } from "react";
import { useLottie } from "lottie-react";

interface LottieProps {
  filename: string;
  style?: React.CSSProperties;
}

const Lottie: React.FC<LottieProps> = ({ filename, style }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const data = await import(`@/assets/lotties/${filename}.json`);
        setAnimationData(data.default);
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    };

    loadAnimation();
  }, [filename]);

  const lottieOptions = {
    animationData: animationData,
    loop: true,
    autoplay: true,
  };

  const { View } = useLottie(lottieOptions);

  if (!animationData) {
    return <div style={style}>...</div>;
  }

  return <div style={style}>{View}</div>;
};

export default Lottie;