import SaltoCraft3 from "@/email/SaltoCraft3.astro";
import { Resend } from "resend";

export const NOTIFICATIONS_EMAIL = "SaltoUruguayServer <notificaciones@saltouruguayserver.com>"
export const AUDIENCE_GENERAL_ID = "58219218-77e7-47da-b726-38c95f20f307"

export const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const sendNotificationEmail = async (emails: string | string[], subject: string, body: string) => {
    try {
        const emailBatches = Array.isArray(emails) ? chunkArray(emails, 50) : [[emails]];

        for (const batch of emailBatches) {
            const { error, data } = await resend.emails.send({
                from: NOTIFICATIONS_EMAIL,
                to: batch,
                subject,
                html: body
            });

            if (error) {
                console.error("Error sending notification email:", error.message);
                throw new Error(error.message);
            }

            console.log(`Notification emails sent: ${data?.id}`);
        }
    } catch (error) {
        console.error("Error sending notification emails:", error);
    }
}

export const broadcastToAudience = async (subject: string, body: string) => {
    try {

        /* 
            First, create the broadcast in Resend.
        */

        const { data } = await resend.broadcasts.create({
            audienceId: AUDIENCE_GENERAL_ID,
            from: NOTIFICATIONS_EMAIL,
            subject,
            html: body
        });

        if (!data) {
            throw new Error("Error creating broadcast");
        }

        console.log(`Broadcast created: ${data.id}`);


        /* 
            Then, send the broadcast to the audience.
        */

        const { error } = await resend.broadcasts.send(data.id)

        if (error) {
            console.error("Error broadcasting to audience:", error.message);
            throw new Error(error.message);
        }

        console.log(`Broadcast to audience sent: ${data?.id}`);
    } catch (error) {
        console.error("Error broadcasting to audience:", error);
    }
}

// Función para dividir un array en lotes de tamaño `size`
const chunkArray = (array: string[], size: number) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    );
};
