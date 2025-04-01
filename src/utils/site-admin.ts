import { getNewSignupsLastWeek, getTotalOfUsers } from "./user"

export const getSiteStats = async () => {
    const [totalUsers, newSignupsWeek] = await Promise.all([
        getTotalOfUsers(),
        getNewSignupsLastWeek()
    ]);

    return {
        totalUsers,
        newSignupsWeek
    }
}