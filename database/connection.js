const mongoose = require('mongoose');



const dbConnection = async() => {

    try {
        
        await mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@maxcourseshop.wdx8w.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`
        ,{ useNewUrlParser: true,useUnifiedTopology: true });

    } catch (error) {
        console.log(error);
        throw new Error('Error a la hora de iniciar la base de datos index');
    }


}

module.exports = {
    dbConnection
}