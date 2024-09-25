const nodemailer = require("nodemailer");

function sendEmail(sender, contacts, subject, body, attachments = null) {
    let transporter = nodemailer.createTransport({
        host: sender.hostname,
        port: sender.port,
        secure: true,
        auth: {
            user: sender.email,
            pass: sender.passcode,
        },
    });

    let mailOptions = {
        from: sender.email,
        to: contacts.to,
        bcc: contacts.bcc,
        subject: subject,
        html: body,
        attachments: attachments,
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function (error) {
            if (error) return reject(error);
            return resolve();
        });
    });
}

module.exports = sendEmail;