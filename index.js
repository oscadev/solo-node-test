const axios = require("axios");
const express = require("express");
const app = express();

let cachedPeople = [];
//cache people for planet data swap
getAllFromPagination(
  "https://swapi.dev/api/people/",
  cachedPeople,
  (res = () => null),
  (sortBy = null)
);

async function getAllFromPagination(url, list, res, sortBy) {
  try {
    const { data } = await axios({
      method: "GET",
      url: url,
    });
    list = [...list, ...data.results];
    if (data.next) {
      console.log("Found next page in pagination: ", data.next);
      getAllFromPagination(data.next, list, res, sortBy);
    } else {
      console.log("No more pages in pagination.");

      let sorted;
      if (sortBy === "name") {
        sorted = list.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1));
        cachedPeople = [...list];
        return res.json && res.json({ data: sorted });
      }
      if (sortBy === "height" || sortBy === "mass") {
        sorted = list.sort((a, b) =>
          parseInt(a[sortBy] === "unknown" ? 0 : a[sortBy]) >
          parseInt(b[sortBy] === "unknown" ? 0 : b[sortBy])
            ? 1
            : -1
        );
        cachedPeople = [...list];

        return res.json && res.json({ data: sorted });
      }
      //check if it is a "planets" fetch
      if (Object.keys(list[0]).includes("residents")) {
        //replace residents with names from cached people
        const fixedPlanetsList = [];

        list.forEach((planet) => {
          let fixedPlanet = { ...planet };
          let fixedResidents = fixedPlanet.residents.map((residentURL) => {
            //replace resident url with person name using the url
            const fixedResident = cachedPeople.find(
              (person) => person.url === residentURL
            );

            return fixedResident.name;
          });
          fixedPlanet.residents = fixedResidents;
          fixedPlanetsList.push(fixedPlanet);
        });
        return res.json && res.json({ data: fixedPlanetsList });
      } else {
        cachedPeople = [...list];
        return res.json && res.json({ data: list });
      }
    }
  } catch (error) {
    console.log("ERROR: ", error);
    return res.json && res.json({ success: false, data: [] });
  }
}

app.get("/people", async (req, res) => {
  const { sortBy } = req.query;
  let list = [];
  getAllFromPagination("https://swapi.dev/api/people/", list, res, sortBy);
});

app.get("/planets", async (req, res) => {
  let list = [];
  //we will need people. Check cache first
  if (!cachedPeople.length) {
    return res.json({
      data: [],
      error: "Still caching data. Please wait and try again...",
    });
  }
  getAllFromPagination("https://swapi.dev/api/planets/", list, res);
});

app.listen(3011, () => console.log("Listening ..."));
