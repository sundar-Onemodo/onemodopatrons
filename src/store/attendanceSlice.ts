// attendanceSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Session {
    date: string;
    checkIn: string;
    checkOut: string;
    totalHours: string;
}

interface AttendanceState {
    sessions: Session[];
}

const initialState: AttendanceState = {
    sessions: [],
};

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        addSession: (state, action: PayloadAction<Session>) => {
            state.sessions.push(action.payload);
        },
    },
});

export const { addSession } = attendanceSlice.actions;
export default attendanceSlice.reducer;
