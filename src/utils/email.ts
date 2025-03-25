import SaltoCraft3 from "@/email/SaltoCraft3.astro";
import { Resend } from "resend";

export const NOTIFICATIONS_EMAIL = "SaltoUruguayServer <notificaciones@saltouruguayserver.com>"

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

// Función para dividir un array en lotes de tamaño `size`
const chunkArray = (array: string[], size: number) => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    );
};
