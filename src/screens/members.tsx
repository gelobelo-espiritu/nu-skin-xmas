import React, { useState, useEffect } from "react";
import Form from "../components/form";
import SnowwyBackground from "../components/snowwy-background";
import { useQuery } from "../hooks/useQuery";

export const Members = () => {
  const query = useQuery();

  const [team, setTeam] = useState<string>("");
  const [code, setCode] = useState<string>("");

  useEffect(() => {
    const queryteam = query.get("team") ?? "";
    const queryCode = query.get("code") ?? "";

    setTeam(queryteam);
    setCode(queryCode);

    console.log("team", queryteam);
    console.log("code", queryCode);
  }, []);

  return (
    <SnowwyBackground>
      {team !== "" && code !== "" ? <Form code={code} team={team} /> : null}
    </SnowwyBackground>
  );
};

export default Members;
