import { Hour } from "../scripts/types";

export const breakfastHours: Hour[] = [
    {
        openTime: "9:00",
        closeTime: "12:00",
        title: "Morning Breakfast",
        note: "Serving eggs and breakfast burritos only during these hours.",
    },
];

export const normalDayHours: Hour[] = [
    {
        openTime: "12:00",
        closeTime: "17:00",
        title: "Afternoon",
        note: "Breakfast items are no longer available.",
    },
    {
        openTime: "17:00",
        closeTime: "21:00",
        title: "Late Hours",
    },
];

export const specialDayHours: Hour[] = [
    {
        openTime: "12:00",
        closeTime: "15:00",
        title: "Afternoon",
        note: "Breakfast items are no longer available.",
    },
    {
        openTime: "15:00",
        closeTime: "18:00",
        title: "Lunch Special Hour",
        note: "Serving special traditional dishes only during these hours.",
    },
    {
        openTime: "18:00",
        closeTime: "21:00",
        title: "Late Hours",
    },
];