import { Drink } from "../scripts/types";

export const meatsNoCheese: { meat: string, price: number}[] = [
    { meat:"Sausage", price: 2.50 },
    { meat: "Asada", price:  2.50 },
    { meat: "Chicken", price: 2.50 },
    { meat: "Pastor", price: 2.50 },
    { meat: "Tripe", price: 2.50 },
    { meat: "Crispy Tripe", price: 3.00 },
    { meat: "Buche (Pork Stomach)", price: 2.75 },
    { meat: "Vegetarian Tacos", price:  1.75 }
];

export const tacoToppings: { topping: string, price: number}[] = [
    { topping: "Sour Cream", price: 0.25 },
    { topping: "Cheese", price: 0.25 },
    { topping: "Avocado", price: 0.25 },
    { topping: "Tomato", price: 0.25 },
    { topping: "Lettuce", price: 0.25 }
]

export const BQNToppings: { topping: string, price: number}[] = [
    { topping: "Avocado", price: 1.00 },
    { topping: "Tomato", price: 1.00 },
    { topping: "Lettuce", price: 1.00 },
    { topping: "Grilled Jalapeno (each)", price: 1.00 },
    { topping: "Side of Grilled Onions", price: 2.00 },
    { topping: "Side of Rice and Beans", price: 7.50 },
    { topping: "One side of rice: small", price: 3.75}
]

export const cans: Drink[] = [
    { name: "Coke", description: "Coca-Cola can, crispy refreshing original taste", price: 2.00 },
    { name: "Fanta", description: "Crisp orange soda can, natural flavors", price: 2.00 },
    { name: "Sprite", description: "Cool and crisp lemon-lime soda can, natural flavors", price: 2.00 },
    { name: "Mountain Dew", description: "Sweet Lemon flavor, contains caffeine", price: 2.00 },
    { name: "Pepsi", description: "Classic pepsi can, contains caffeine", price: 2.00 },
    { name: "Diet Coke", description: "Sugar free, no calorie Coca-Cola can", price: 2.00 }
];

export const bottles: Drink[] = [
    { name: "Coca-Cola Mexico", description: "Original Coca-Cola taste in a bottle", price: 5.00 },
    { name: "Mandarin", description: "Sweet citrusy mandarin orange, natural sugar", price: 4.00 },
    { name: "Tamarindo", description: "A sweet tamarind soda, naturaly flavored", price: 4.00 },
    { name: "Pineapple", description: "Refreshing pineapple soda, sweet refreshing flavors", price: 4.00 },
    { name: "Apple", description: "Crisp and light fizzy apple soda", price: 4.00 },
    { name: "Sangria", description: "Citric fresh grape soda, mocking the traditional alcoholic Mexican sangria-flavor, non-alcoholic", price: 4.00 },
    { name: "Water", description: "Kirkland branded purified water", price: 2.00 }
]

export const aguaFrescas: Drink[] = [
    { name: "Horchata", description: "Sweet rice drink with cinnamon and vanilla", price: 4.00 },
    { name: "Jamaica", description: "Hibiscus tea with a tart, refreshing flavor", price: 4.00 }
]
