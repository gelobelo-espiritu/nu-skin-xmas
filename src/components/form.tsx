import React, { useState, useEffect } from "react";
import Select, { StylesConfig } from "react-select";

import "./form.styles.scss";
import teams from "../assets/teams.json";
import selection from "../assets/selection.json";
import prizes from "../assets/prize.json";

import NuSkinLogo from "../assets/nu-skin-logo.png";
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  query,
  collection,
  onSnapshot,
  where,
} from "firebase/firestore";
import db from "./db";

import { TeamOptions, Option, Teams, Member, Prizes } from "./interfaces";

/*

const teamObject = teams as Array<Teams>;
teamObject.forEach(async (obj) => {
  await setDoc(doc(db, "teams", obj.teamname), {
    isOpen: false,
    teamname: obj.teamname,
    members: obj.members,
  });
});

const selectionObject = selection as Array<TeamOptions>;
selectionObject.forEach(async (obj) => {
  await setDoc(doc(db, "selection", obj.teamname), {
    teamname: obj.teamname,
    options: obj.options,
  });
});

const prizesObject = prizes as Array<Prizes>;
prizesObject.forEach(async (obj) => {
  await setDoc(doc(db, "prizes", obj.teamname), {
    teamname: obj.teamname,
    prizes: obj.prizes,
  });
});

*/

const selectStyles: StylesConfig = {
  control: (styles) => ({
    ...styles,
    backgroundColor: "rgba(1, 40, 19, 0.52)",
    marginTop: 10,
    width: 200,
    border: 0,
    // This line disable the blue border
    boxShadow: "none",
  }),
  option: (styles) => ({
    ...styles,
    backgroundColor: "rgba(1, 40, 19, 0.52)",
    color: "white",
  }),
  dropdownIndicator: (styles) => ({ ...styles, color: "white" }),
  input: (styles) => ({ ...styles, textAlign: "center" }),
  placeholder: (styles) => ({ ...styles, color: "white" }),
  singleValue: (styles, { data }) => ({
    ...styles,
    color: "white",
    textAlign: "center",
    fontSize: 20,
  }),
  menuList: (styles) => ({
    ...styles,
    backgroundColor: "rgba(1, 40, 19, 0.52)",
  }),
  menu: (styles) => ({
    ...styles,
    backgroundColor: "rgba(1, 40, 19, 0.52)",
  }),
};

type FormProps = {
  code: string;
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

const Form: React.FC<FormProps> = ({
  code,
  team,
}: {
  code: string;
  team: string;
}) => {
  const [teamName, setTeamName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [showError, setShowError] = useState<boolean>(false);
  const [memberName, setMemberName] = useState<string>("");
  const [memberStatus, setMemberStatus] = useState<string>("");
  const [options, setOptions] = useState<Array<Option>>([]);
  const [chosenOption, setSelectedOption] = useState<Option | undefined>(
    undefined
  );
  const [chosenNumber, setChosenNumber] = useState<string | undefined>(
    undefined
  );
  const [isOpen, setRaffleOpen] = useState<boolean>(false);

  useEffect(() => {
    const q = query(collection(db, "teams"), where("teamname", "==", team));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("SUBSCRIBED");
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const teamData = change.doc.data() as Teams;
          const isOpen = teamData.isOpen;
          const status =
            teamData.members.find((memberObject) => memberObject.code === code)
              ?.status ?? "";
          setMemberStatus(status);
          setRaffleOpen(isOpen);
        }
      });
    });
    async function fetchData() {
      setTeamName(team);
      const members = await getTeamMembers(team);
      const options = await getTeamOptions(team);

      setLoading(false);
      setRaffleOpen(members.isOpen);

      const name =
        members.member.find((memberObject) => memberObject.code === code)
          ?.name ?? "";
      const status =
        members.member.find((memberObject) => memberObject.code === code)
          ?.status ?? "";
      setMemberName(name);
      setMemberStatus(status);

      const optionsData = options.filter(
        (optionObject) => optionObject.value === ""
      );
      setOptions(optionsData);

      const chosen: string | undefined = options.find(
        (optionObject) => optionObject.value === name
      )?.label;
      setChosenNumber(chosen);
    }

    fetchData();
    return () => {
      console.log("UNSUBSCRIBED");
      unsubscribe();
    };
  }, []);

  const userNotFound: boolean = memberName === "";

  const checkOptionAvailable = (
    option: string,
    teamOptions: Array<Option>
  ): boolean => {
    return (
      teamOptions.find((optionObject) => optionObject.label == option)
        ?.value === ""
    );
  };

  const handleChange = async (selectedOption: unknown) => {
    console.log(selectedOption);
    setShowError(false);
    const selected = selectedOption as Option;
    setSelectedOption(selected);
  };

  const submitClicked = async () => {
    if (chosenOption === undefined) {
      return;
    }
    setShowError(false);

    const docRef = doc(db, "selection", teamName);

    try {
      const newSelection = await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const options = (sfDoc.data() as TeamOptions).options;
        const isAvailable = checkOptionAvailable(chosenOption.label, options);

        if (isAvailable) {
          const index = options.findIndex(
            (optionData) => optionData.label == chosenOption.label
          );
          options[index] = { label: chosenOption.label, value: memberName };

          transaction.update(docRef, {
            teamname: teamName,
            options: options,
          });

          setChosenNumber(chosenOption.label);
          return options;
        } else {
          const optionsData = options.filter(
            (optionObject) => optionObject.value === ""
          );
          setOptions(optionsData);
          setShowError(true);
          return options;
        }
      });
    } catch (e) {}
  };

  const FormHeader = () => {
    return (
      <div className="header">
        <img className="logo" src={NuSkinLogo}></img>
        <h1>Christmas Raffle!</h1>
      </div>
    );
  };

  const UserNotFoundView = () => {
    return (
      <div className="content">
        <span
          style={{ color: "#fff9d1", fontSize: 30 }}
        >{`User Not Found!`}</span>
      </div>
    );
  };

  const TaggedAbsent = () => {
    return (
      <div className="content">
        <span
          style={{ color: "#fff9d1", fontSize: 30 }}
        >{`Sorry you are tagged absent!`}</span>
      </div>
    );
  };

  const UserAlreadyChosen = () => {
    return (
      <div className="content">
        <span
          style={{ color: "#fff9d1", fontSize: 20 }}
        >{`Hello ${memberName}!`}</span>
        <span
          style={{ color: "#fff9d1", fontSize: 20, marginTop: 20 }}
        >{`You have chosen ${chosenNumber}!`}</span>
      </div>
    );
  };

  const RaffleNotOpen = () => {
    return (
      <div className="content">
        <span
          style={{ color: "#fff9d1", fontSize: 20 }}
        >{`Hello ${memberName}!`}</span>
        <span
          style={{
            color: "#fff9d1",
            fontSize: 20,
            marginTop: 20,
            textAlign: "center",
          }}
        >{`Raffle is still not open. Please wait for further announcements!`}</span>
      </div>
    );
  };

  const Content = () => {
    if (memberStatus === "absent") {
      return <TaggedAbsent />;
    }
    if (userNotFound === true) {
      return <UserNotFoundView />;
    }

    if (isOpen === false) {
      return <RaffleNotOpen />;
    }

    if (chosenNumber !== undefined) {
      return <UserAlreadyChosen />;
    }

    return (
      <div className="content">
        <span
          style={{ color: "#fff9d1", fontSize: 20 }}
        >{`Hello ${memberName}!`}</span>
        <span style={{ marginTop: 20, color: "#fff9d1" }}>
          Please select a number :
        </span>
        <Select
          placeholder="Select a number"
          value={chosenOption}
          options={options}
          styles={selectStyles}
          onChange={handleChange}
        />
        <div className="button" onClick={submitClicked}>
          Submit
        </div>
        {
          <span
            style={{
              color: "red",
              fontSize: 20,
              textAlign: "center",
              marginTop: 20,
              whiteSpace: "pre-wrap",
            }}
          >
            {showError && `Selected number not available!`}
          </span>
        }
      </div>
    );
  };

  return (
    <div className="form">
      <FormHeader />
      {!loading && <Content />}
    </div>
  );
};

export default Form;
