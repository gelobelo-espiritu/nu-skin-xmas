import React, { useState, useEffect, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  onSnapshot,
  where,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { shuffle, sortBy } from "lodash";

import "./form.styles.scss";
import prizes from "../assets/prize.json";
import selection from "../assets/selection.json";
import teams from "../assets/teams.json";

import NuSkinLogo from "../assets/nu-skin-logo.png";
import db from "./db";

import { useTable } from "react-table";
import {
  Option,
  TotalResults,
  Member,
  TeamOptions,
  RaffleResult,
  Teams,
  Prizes,
  ModifiedRaffleResults,
} from "./interfaces";

type ReportProps = {
  team: string;
};

const LOWEST_PRIZE = 5000;

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

const TableContainer = ({
  columns,
  data,
  hasMargin = false,
  onUpdateStatus,
}: {
  columns: any;
  data: any;
  hasMargin: boolean;
  onUpdateStatus?: (status: string, code: string) => void;
}) => {
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({
      columns,
      data,
    });

  return (
    // If you're curious what props we get as a result of calling our getter functions (getTableProps(), getRowProps())
    // Feel free to use console.log()  This will help you better understand how react table works underhood.
    <table
      {...getTableProps()}
      className="styled-table"
      style={{ marginLeft: hasMargin ? 25 : 0 }}
    >
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
                if (
                  cell.column.Header === "Action" &&
                  row.values.status === "present"
                ) {
                  return (
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateStatus?.(row.values.status, row.values.name);
                        }}
                      >
                        TAG ABSENT
                      </button>
                    </td>
                  );
                } else if (
                  cell.column.Header === "Action" &&
                  row.values.status === "absent"
                ) {
                  return (
                    <td>
                      &nbsp; &nbsp; &nbsp;
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateStatus?.(row.values.status, row.values.name);
                        }}
                      >
                        TAG PRESENT
                      </button>
                    </td>
                  );
                }
                return (
                  <td {...cell.getCellProps()}>
                    {cell.column.Header === "Status"
                      ? cell.value.toUpperCase()
                      : cell.render("Cell")}
                  </td>
                );
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
  const [teamMembers, setTeamMembers] = useState<Array<Member>>([]);
  const [pending, setPendingMembers] = useState<Array<Member>>([]);
  const [raffleResultsArray, setRaffleResults] = useState<
    Array<ModifiedRaffleResults>
  >([]);
  const [isOpen, setRaffleOpen] = useState<boolean>(false);

  const columnsPending = useMemo(
    () => [
      {
        Header: "Pending Members",
        accessor: "name",
      },
      {
        Header: "Status",
        accessor: "status",
      },
      {
        Header: "Action",
        accessor: "",
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
      {
        Header: "Status",
        accessor: "status",
      },
      {
        Header: "Action",
        accessor: "",
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

  const numberWithCommas = (x: number) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  useEffect(() => {
    const q = query(collection(db, "selection"), where("teamname", "==", team));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("SUBSCRIBED SELECTION");
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "modified") {
          const membersData = await getTeamMembers(team);

          const optionsData = (change.doc.data() as TeamOptions).options;
          const pendingMembers = membersData.member.filter((memberObject) => {
            return (
              optionsData.find(
                (optionObject) => optionObject.value === memberObject.name
              ) === undefined
            );
          });
          setTeamMembers(membersData.member);
          setPendingMembers(pendingMembers);
          setOption(optionsData);
        }
      });
    });

    const x = query(collection(db, "teams"), where("teamname", "==", team));

    const unsubscribeTeam = onSnapshot(x, (snapshot) => {
      console.log("SUBSCRIBED TEAM");
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "modified") {
          const optionsData = await getTeamOptions(team);
          const modifiedTeam = change.doc.data() as Teams;
          const pendingMembers = modifiedTeam.members.filter((memberObject) => {
            return (
              optionsData.find(
                (optionObject) => optionObject.value === memberObject.name
              ) === undefined
            );
          });

          setTeamMembers(modifiedTeam.members);
          setPendingMembers(pendingMembers);
        }
      });
    });
    async function fetchData() {
      setTeamName(team);
      const membersData = await getTeamMembers(team);
      const optionsData = await getTeamOptions(team);
      const raffleResults = await getTeamRaffleResults(team);
      setRaffleOpen(membersData.isOpen);

      const pendingMembers = membersData.member.filter((memberObject) => {
        return (
          optionsData.find(
            (optionObject) => optionObject.value === memberObject.name
          ) === undefined
        );
      });

      setPendingMembers(pendingMembers);
      setTeamMembers(membersData.member);
      setOption(optionsData);

      if (raffleResults.length > 0) {
        const raffResults: Array<ModifiedRaffleResults> = raffleResults.map(
          (result) => {
            return {
              name: result.name,
              option: result.option,
              prize: numberWithCommas(result.prize),
            };
          }
        );
        setRaffleResults(raffResults);
      } else {
        setRaffleResults([]);
      }
      setLoading(false);
    }

    fetchData();
    return () => {
      console.log("UNSUBSCRIBED");
      unsubscribe();
      unsubscribeTeam();
    };
  }, []);

  const absentMembersCount = teamMembers.filter(
    (member) => member.status === "absent"
  ).length;

  const doneMembersCount = optionsArray.filter(
    (opt) => opt.value !== ""
  ).length;

  const submitClicked = async () => {
    const prizes = await getTeamPrizes(teamName);

    const sortedPrizes = sortBy(prizes);
    if (absentMembersCount > 0) {
      sortedPrizes.splice(0, absentMembersCount);
    }

    const shuffledPrizes = shuffle(sortedPrizes);
    const filteredOptionArray = optionsArray.filter((op) => op.value !== "");

    const raffleResults: Array<RaffleResult> = shuffledPrizes.map(
      (prize, index) => {
        const selected = filteredOptionArray[index];
        return { name: selected.value, option: selected.label, prize };
      }
    );

    const absentMemberPrizes: Array<RaffleResult> = teamMembers
      .filter((member) => member.status === "absent")
      .map((absentee) => {
        return { name: absentee.name, option: "-", prize: LOWEST_PRIZE };
      });

    const combinedRaffleResults = raffleResults.concat(absentMemberPrizes);

    await setDoc(doc(db, "results", teamName), {
      results: combinedRaffleResults,
    });
    const modifiedRaffleResult: Array<ModifiedRaffleResults> =
      combinedRaffleResults.map((result) => {
        return {
          name: result.name,
          option: result.option,
          prize: numberWithCommas(result.prize),
        };
      });
    setRaffleResults(modifiedRaffleResult);
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

  const setMemberStatus = async (status: string, code: string) => {
    const docRef = doc(db, "teams", teamName);

    try {
      const newSelection = await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const teamData = sfDoc.data() as Teams;
        const members = teamData.members;

        const index = members.findIndex((member) => member.name === code);

        const updateMember = members[index];
        members[index] = {
          name: updateMember.name,
          code: updateMember.code,
          status: status === "present" ? "absent" : "present",
        };

        transaction.update(docRef, {
          members,
          teamname: teamData.teamname,
          isOpen: teamData.isOpen,
        });
      });
    } catch (e) {
      console.log("GELOBELO ", e);
    }
  };

  const resetClicked = async () => {
    const resetSelection = selection.find(
      (optionObject) => optionObject.teamname === teamName
    );

    const resetTeam = teams.find(
      (optionObject) => optionObject.teamname === teamName
    );

    await setDoc(doc(db, "selection", teamName), resetSelection);
    await setDoc(doc(db, "teams", teamName), resetTeam);
    await deleteDoc(doc(db, "results", teamName));
    setRaffleResults([]);
    setRaffleOpen(false);
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

  const submitWillShow =
    pending.length === 0 ||
    absentMembersCount + doneMembersCount === teamMembers.length;

  const Content = () => {
    if (raffleResultsArray.length > 0) {
      return (
        <div className="report">
          <TableContainer
            hasMargin={false}
            columns={columnsRaffle}
            data={raffleResultsArray}
          />
          <div className="button" onClick={resetClicked}>
            Reset
          </div>
        </div>
      );
    }

    return (
      <div className="report">
        <div className="tableContainer">
          {pending.length > 0 && (
            <>
              <TableContainer
                hasMargin={false}
                columns={isOpen ? columnsPending : columnsWaiting}
                data={pending}
                onUpdateStatus={setMemberStatus}
              />
            </>
          )}
          {isOpen && (
            <TableContainer
              columns={columnsSelection}
              data={optionsArray}
              hasMargin={pending.length > 0 ? true : false}
            />
          )}
        </div>
        {submitWillShow && (
          <div className="button" onClick={submitClicked}>
            Submit
          </div>
        )}

        {isOpen === false && (
          <div className="button" onClick={openRaffle}>
            Open Raffle
          </div>
        )}
        <div className="button" onClick={resetClicked}>
          Reset
        </div>
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
