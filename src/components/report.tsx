import React, { useState, useEffect, useMemo } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { shuffle } from "lodash";

import "./form.styles.scss";
import prizes from "../assets/prize.json";

import NuSkinLogo from "../assets/nu-skin-logo.png";
import db from "./db";

// Import the functions you need from the SDKs you need
import { useTable } from "react-table";
import {
  Option,
  TotalResults,
  Member,
  TeamOptions,
  RaffleResult,
  Teams,
  Prizes,
} from "./interfaces";

type ReportProps = {
  team: string;
};

const getTeamOptions = async (team: string): Promise<Array<Option>> => {
  const selectionRef = doc(db, "selection", team);
  const selectionSnap = await getDoc(selectionRef);
  if (selectionSnap.exists()) {
    return (selectionSnap.data() as TeamOptions).options;
  } else {
    return [];
  }
};

const getTeamMembers = async (
  team: string
): Promise<{ member: Array<Member>; isOpen: boolean }> => {
  const teamRef = doc(db, "teams", team);
  const teamSnap = await getDoc(teamRef);
  if (teamSnap.exists()) {
    return {
      member: (teamSnap.data() as Teams).members,
      isOpen: (teamSnap.data() as Teams).isOpen,
    };
  } else {
    return { member: [], isOpen: false };
  }
};

const getTeamPrizes = async (team: string): Promise<Array<number>> => {
  const prizeRef = doc(db, "prizes", team);
  const prizeSnap = await getDoc(prizeRef);
  if (prizeSnap.exists()) {
    return (prizeSnap.data() as Prizes).prizes;
  } else {
    return [];
  }
};

const getTeamRaffleResults = async (
  team: string
): Promise<Array<RaffleResult>> => {
  const resultsRef = doc(db, "results", team);
  const resultsSnap = await getDoc(resultsRef);
  if (resultsSnap.exists()) {
    return (resultsSnap.data() as TotalResults).results;
  } else {
    return [];
  }
};

const TableContainer = ({ columns, data }: { columns: any; data: any }) => {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
    });

  return (
    // If you're curious what props we get as a result of calling our getter functions (getTableProps(), getRowProps())
    // Feel free to use console.log()  This will help you better understand how react table works underhood.
    <table {...getTableProps()} className="styled-table">
      <thead>
        {headerGroups.map((headerGroup) => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <th {...column.getHeaderProps()}>{column.render("Header")}</th>
            ))}
          </tr>
        ))}
      </thead>

      <tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row);
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map((cell) => {
                return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const Report: React.FC<ReportProps> = ({ team }: { team: string }) => {
  const [teamName, setTeamName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [optionsArray, setOption] = useState<Array<Option>>([]);
  const [pending, setPendingMembers] = useState<Array<Member>>([]);
  const [raffleResultsArray, setRaffleResults] = useState<Array<RaffleResult>>(
    []
  );
  const [isOpen, setRaffleOpen] = useState<boolean>(false);

  const columnsPending = useMemo(
    () => [
      {
        Header: "Pending Members",
        accessor: "name",
      },
    ],
    []
  );

  const columnsWaiting = useMemo(
    () => [
      {
        Header: "Team Members",
        accessor: "name",
      },
    ],
    []
  );

  const columnsSelection = useMemo(
    () => [
      {
        Header: "Option",
        accessor: "label",
      },
      {
        Header: "Member Name",
        accessor: "value",
      },
    ],
    []
  );

  const columnsRaffle = useMemo(
    () => [
      {
        Header: "Option",
        accessor: "option",
      },
      {
        Header: "Member Name",
        accessor: "name",
      },
      {
        Header: "Prize",
        accessor: "prize",
      },
    ],
    []
  );

  useEffect(() => {
    async function fetchData() {
      setTeamName(team);
      const members = await getTeamMembers(team);
      const optionsData = await getTeamOptions(team);
      const raffleResults = await getTeamRaffleResults(team);
      setRaffleOpen(members.isOpen);
      const pendingMembers = members.member.filter((memberObject) => {
        return (
          optionsData.find(
            (optionObject) => optionObject.value === memberObject.name
          ) === undefined
        );
      });

      setPendingMembers(pendingMembers);
      setOption(optionsData);
      setRaffleResults(raffleResults);

      setLoading(false);
    }

    fetchData();
  }, []);

  const submitClicked = async () => {
    const prizes = await getTeamPrizes(teamName);
    const shuffledPrizes = shuffle(prizes);

    const raffleResults: Array<RaffleResult> = shuffledPrizes.map(
      (prize, index) => {
        const selected = optionsArray[index];
        return { name: selected.value, option: selected.label, prize };
      }
    );

    await setDoc(doc(db, "results", teamName), { results: raffleResults });
    setRaffleResults(raffleResults);
  };

  const openRaffle = async () => {
    const teamsObject = await getTeamMembers(teamName);
    const teamUpdate: Teams = {
      members: teamsObject.member,
      isOpen: true,
      teamname: teamName,
    };
    await setDoc(doc(db, "teams", teamName), teamUpdate);
    setRaffleOpen(true);
  };

  const FormHeader = () => {
    const result = raffleResultsArray.length > 0 ? " Results" : "";
    return (
      <div className="header">
        <img className="logo" src={NuSkinLogo}></img>
        <h1>{`Christmas Raffle${result}!`}</h1>
      </div>
    );
  };

  const Content = () => {
    if (raffleResultsArray.length > 0) {
      return (
        <div className="report">
          <TableContainer columns={columnsRaffle} data={raffleResultsArray} />
        </div>
      );
    }

    return (
      <div className="report">
        {pending.length > 0 && (
          <>
            <TableContainer
              columns={isOpen ? columnsPending : columnsWaiting}
              data={pending}
            />
            <br />
          </>
        )}
        {isOpen && (
          <TableContainer columns={columnsSelection} data={optionsArray} />
        )}
        {pending.length === 0 && (
          <div className="button" onClick={submitClicked}>
            Submit
          </div>
        )}

        {isOpen === false && (
          <div className="button" onClick={openRaffle}>
            Open Raffle
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="reportForm">
      <FormHeader />
      {!loading && <Content />}
    </div>
  );
};

export default Report;
