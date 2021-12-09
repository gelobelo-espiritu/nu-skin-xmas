export interface Prizes {
  teamname: string;
  prizes: Array<number>;
}

export interface Option {
  label: string;
  value: string;
}

export interface TeamOptions {
  teamname: string;
  options: Array<Option>;
}

export interface Member {
  name: string;
  code: string;
}

export interface Teams {
  teamname: string;
  members: Array<Member>;
  isOpen: boolean;
}

export interface RaffleResult {
  name: string;
  option: string;
  prize: number;
}

export interface ModifiedRaffleResults {
  name: string;
  option: string;
  prize: string;
}

export interface TotalResults {
  results: Array<RaffleResult>;
}
