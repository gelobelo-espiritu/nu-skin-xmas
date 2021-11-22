import React from "react";
import "./snowwy-background.styles.scss";

const SnowwyBackground: React.FC = ({ children }) => {
  return (
    <div className="wrapper">
      <div className="snow layer1"></div>
      <div className="snow layer1 a"></div>
      <div className="snow layer2"></div>
      <div className="snow layer2 a"></div>
      <div className="snow layer3"></div>
      <div className="snow layer3 a"></div>
      <div className="snowwy-village"></div>
      {children}
    </div>
  );
};

export default SnowwyBackground;
