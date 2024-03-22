const nodeMailer= require('nodemailer');


exports.sendEmail = async (options)=>{
    var transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "032720a5041542",
          pass: "f7872d7f03e4a2"
        }
      });

    const mailOptions= {
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
    }

    await transporter.sendMail(mailOptions);
}