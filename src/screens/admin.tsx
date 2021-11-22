import React, { useState, useEffect } from "react";
import SnowwyBackground from "../components/snowwy-background";
import Report from "../components/report";
import { useQuery } from "../hooks/useQuery";

export const Admin = () => {
  const query = useQuery();

  const [team, setTeam] = useState<string>("");
  useEffect(() => {
    const queryteam = query.get("team") ?? "";

    setTeam(queryteam);

    console.log("team", queryteam);
  }, []);
  return (
    <SnowwyBackground>{team !== "" && <Report team={team} />}</SnowwyBackground>
  );
};

export default Admin;
