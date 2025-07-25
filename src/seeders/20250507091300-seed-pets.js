"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("pet", [
      // main client
      {
        name: "Firulais",
        breed: "Labrador",
        age: 3,
        zone: "centro",
        description: "Perro muy activo y juguetón",
        comments: "Le gusta correr mucho",
        medical_condition: "Ninguna",
        photo: "firulais.jpg",
        owner_id: 3,
        is_enable: true,
      },
      {
        name: "Luna",
        breed: "Poodle",
        age: 5,
        zone: "centro",
        description: "Tranquila y obediente",
        comments: "Tiene miedo a los ruidos fuertes",
        medical_condition: "Asma",
        photo: "luna.jpg",
        owner_id: 3,
        is_enable: true,
      },
      // Cliente 1: Pedro
      {
        name: "Max",
        breed: "Labrador",
        age: 5,
        zone: "sur",
        description: "Perro enérgico y juguetón",
        comments: "Necesita correa resistente",
        medical_condition: "Alergia a pasto",
        photo: "max.png",
        owner_id: 7,
        is_enable: true,
      },
      {
        name: "Luna",
        breed: "Poodle",
        age: 3,
        zone: "sur",
        description: "Pequeña y mimada",
        comments: "Se asusta con ruidos fuertes",
        medical_condition: "Ninguna",
        photo: "luna.png",
        owner_id: 7,
        is_enable: true,
      },
      {
        name: "Toby",
        breed: "Beagle",
        age: 4,
        zone: "sur",
        description: "Curioso y rastreador",
        comments: "Tira mucho de la correa",
        medical_condition: "Otitis crónica",
        photo: "toby.png",
        owner_id: 7,
        is_enable: true,
      },
      // Cliente 2: Lucía
      {
        name: "Canela",
        breed: "Cocker Spaniel",
        age: 6,
        zone: "norte",
        description: "Tranquila y cariñosa",
        comments: "Le gusta caminar lento",
        medical_condition: "Artritis leve",
        photo: "canela.png",
        owner_id: 8,
        is_enable: true,
      },
      {
        name: "Rocky",
        breed: "Bulldog",
        age: 2,
        zone: "norte",
        description: "Sociable y robusto",
        comments: "Ronca mucho",
        medical_condition: "Problemas respiratorios",
        photo: "rocky.png",
        owner_id: 8,
        is_enable: true,
      },
      {
        name: "Milo",
        breed: "Shih Tzu",
        age: 5,
        zone: "norte",
        description: "Pequeño pero valiente",
        comments: "Protege mucho a su dueña",
        medical_condition: "Ninguna",
        photo: "milo.png",
        owner_id: 8,
        is_enable: true,
      },
      // Cliente 3: Mario
      {
        name: "Bruno",
        breed: "Golden Retriever",
        age: 7,
        zone: "centro",
        description: "Muy amigable con niños",
        comments: "Necesita largos paseos",
        medical_condition: "Displasia de cadera",
        photo: "bruno.png",
        owner_id: 9,
        is_enable: true,
      },
      {
        name: "Kiara",
        breed: "Pastor Alemán",
        age: 4,
        zone: "centro",
        description: "Obediente y activa",
        comments: "Reacciona ante gatos",
        medical_condition: "Ninguna",
        photo: "kiara.png",
        owner_id: 9,
        is_enable: true,
      },
      {
        name: "Simba",
        breed: "Shar Pei",
        age: 3,
        zone: "sur",
        description: "Reservado con extraños",
        comments: "No le gusta que lo toquen en la cara",
        medical_condition: "Pliegues irritados",
        photo: "simba.png",
        owner_id: 9,
        is_enable: true,
      },
      // Cliente 4: Sara
      {
        name: "Nina",
        breed: "Chihuahua",
        age: 2,
        zone: "norte",
        description: "Pequeña y nerviosa",
        comments: "Se asusta con perros grandes",
        medical_condition: "Ninguna",
        photo: "nina.png",
        owner_id: 10,
        is_enable: true,
      },
      {
        name: "Thor",
        breed: "Boxer",
        age: 6,
        zone: "centro",
        description: "Fuerte y protector",
        comments: "Muy enérgico",
        medical_condition: "Displasia leve",
        photo: "thor.png",
        owner_id: 10,
        is_enable: true,
      },
      {
        name: "Bella",
        breed: "Schnauzer",
        age: 4,
        zone: "sur",
        description: "Inteligente y tranquila",
        comments: "No le gusta mojarse",
        medical_condition: "Ninguna",
        photo: "bella.png",
        owner_id: 10,
        is_enable: true,
      },
      // Cliente 5: David
      {
        name: "Coco",
        breed: "Border Collie",
        age: 5,
        zone: "centro",
        description: "Muy inteligente y activo",
        comments: "Necesita estimulación constante",
        medical_condition: "Ninguna",
        photo: "coco.png",
        owner_id: 11,
        is_enable: true,
      },
      {
        name: "Daisy",
        breed: "Basset Hound",
        age: 6,
        zone: "centro",
        description: "Cariñosa y algo floja",
        comments: "Camina lento",
        medical_condition: "Oídos sensibles",
        photo: "daisy.png",
        owner_id: 11,
        is_enable: true,
      },
      {
        name: "Rocco",
        breed: "Husky",
        age: 4,
        zone: "centro",
        description: "Necesita mucho ejercicio",
        comments: "Ladra fuerte",
        medical_condition: "Sensibilidad al calor",
        photo: "rocco.png",
        owner_id: 11,
        is_enable: true,
      },
      // mascota de prueba para cliente_wsp
      {
        name: "Sam",
        breed: "Border Collie",
        age: 8,
        zone: "centro",
        description: "mascota de prueba para el redireccionamiento a wsp",
        comments: "mascota de prueba para el redireccionamiento a wsp",
        medical_condition: "mascota de prueba para el redireccionamiento a wsp",
        photo: "sam.png",
        owner_id: 12,
        is_enable: true,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("pet", null, {});
  },
};
