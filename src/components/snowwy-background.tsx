import React from "react";
import "./snowwy-background.styles.scss";

const SnowwyBackground: React.FC = ({ children }) => {
  return (
    <div className="wrapper">
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="bokeh"></div>
      <div className="snowwy-village"></div>
      {children}
    </div>
  );
};

export default SnowwyBackground;
