import sequelize from '../sequelize.js';
import Ingre from './ingredients.model.js';
import Order from './orders.model.js';
import User from './users.model.js';
import School from './school.model.js';
import Classroom from './classroom.model.js';
import Nutrition from './nutritions.model.js';
import Category from './category.model.js';

const db = {
  Ingre,
  Order,
  User,
  School,
  Classroom,
  Nutrition,
  Category
};

// --- Foriegn key association

// ingredients <-> nutrition_facts (asd)
Ingre.hasOne(Nutrition, { foreignKey: 'ingredientId', onDelete: 'CASCADE' });
Nutrition.belongsTo(Ingre, { foreignKey: 'ingredientId', onDelete: 'CASCADE' });

// category <-> ingredients
Category.hasMany(Ingre, { foreignKey: 'categoryId' });
Ingre.belongsTo(Category, { foreignKey: 'categoryId' });

// users <-> orders ()
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

db.sequelize = sequelize;

export default db;
