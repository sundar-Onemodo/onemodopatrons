// authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  signupCountry: any;
  profileId: string | null;
  userproid: any;
  phNumber: string | null;
  emailId: string | null;
  username: string | null;
  companyId: string | null;
  employeeId: string | null;
  authToken: string | null;
  totalWorkedHours: string | null;
  shiftHour: string | null; // Optional field for shift hours
}

const initialState: AuthState = {
  signupCountry: null,
  profileId: null,
  userproid: null,
  phNumber: null,
  emailId: null,
  username: null,
  companyId: null,
  employeeId: null,
  authToken: null,
  totalWorkedHours: null,
  shiftHour: null, // Initialize shiftHour as null
};

const authSlice = createSlice({
  name: "authstore",
  initialState,
  reducers: {
    setphNumber: (state, action: PayloadAction<string>) => {
      state.phNumber = action.payload;
    },
    setSignupCountry: (state, action: PayloadAction<string>) => {
      state.signupCountry = action.payload;
    },
    setProfileId: (state, action: PayloadAction<string>) => {
      state.profileId = action.payload;
    },
    setProid: (state, action: PayloadAction<any>) => {
      state.userproid = action.payload;
    },
    setEmailId: (state, action: PayloadAction<string>) => {
      state.emailId = action.payload;
    },
    setUserName: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    setCompanyId: (state, action: PayloadAction<string>) => {
      state.companyId = action.payload;
    },
    setEmployeeId: (state, action: PayloadAction<string>) => {
      state.employeeId = action.payload;
    },
    setAuthToken: (state, action: PayloadAction<string>) => {
      state.authToken = action.payload;
    },
    setTotalWorkedHours: (state, action: PayloadAction<string>) => {
  state.totalWorkedHours = action.payload;
},
setShifthours: (state, action: PayloadAction<string | null>) => {
      state.shiftHour = action.payload;
    },
    resetAuth: (state) => {
      state.signupCountry = null;
      state.profileId = null;
      state.userproid = null;
      state.phNumber = null;
      state.emailId = null;
      state.username = null;
      state.companyId = null;
      state.employeeId = null;
      state.authToken = null;
      state.totalWorkedHours = null;
      state.shiftHour = null; // Reset shiftHour to null
    },
  },
});

export const {
  setSignupCountry,
  setProfileId,
  resetAuth,
  setProid,
  setphNumber,
  setEmailId,
  setUserName,
  setCompanyId,
  setEmployeeId,
  setAuthToken,
  setTotalWorkedHours,
  setShifthours,
} = authSlice.actions;

export default authSlice.reducer;
