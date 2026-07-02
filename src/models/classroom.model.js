import { DataTypes } from 'sequelize';
import sequelize from '../sequelize.js';

const classroom_model = sequelize.define(
  "classroom",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    classname: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    tableName: "classroom",
    schema: "crud_market",
    timestamps: false
  }
);

export default classroom_model;