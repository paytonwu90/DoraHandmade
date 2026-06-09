import { createSlice } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const messageSlice = createSlice({
    name: "message",
    initialState: [
        // {
        //     id: 1,
        //     type: "success",
        //     title: "成功",
        //     text: "這是一則成功訊息範例",
        // }
    ],
    reducers: {
        createMessage(state, action) {
            state.push({
              id: action.payload.id,
              type: action.payload.success ? "success" : "error",
              text: action.payload.message,
            });
        },
        removeMessage(state, action) {
            const index = state.findIndex(message => message.id === action.payload);
            if (index !== -1) {
                state.splice(index, 1);
            }
        }
    }
});

export const createAsyncMessage = createAsyncThunk(
    'message/createMessage',
    async (payload, { dispatch, requestId }) => {
        dispatch(createMessage({
            ...payload,
            id: requestId,
        }));
        setTimeout(() => {
            dispatch(removeMessage(requestId));
        }, 3000);
    }
)

export const { createMessage, removeMessage } = messageSlice.actions;

export default messageSlice.reducer;