export interface ILobby {
  id: string;
  users: { id: string, list: any }[];
  actions: any[];
}