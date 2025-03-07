//Setup
  export default async function ({login, rest, q}, {enabled = false, from:defaults = 100} = {}) {
    //Plugin execution
      try {
        //Check if plugin is enabled and requirements are met
          if ((!enabled)||(!q.habits))
            return null
        //Parameters override
          let {"habits.from":from = defaults.from ?? 100} = q
          //Events
            from = Math.max(1, Math.min(100, Number(from)))
        //Initialization
          const habits = {commits:{hour:NaN, hours:{}}, indents:{style:"", spaces:0, tabs:0}}
        //Get user recent commits from events
          const events = await rest.activity.listEventsForAuthenticatedUser({username:login, per_page:from})
          const commits = events.data
            .filter(({type}) => type === "PushEvent")
            .filter(({actor}) => actor.login === login)
        //Commit hour
          {
            //Compute commit hours
              const hours = commits.map(({created_at}) => (new Date(created_at)).getHours())
              for (const hour of hours)
                habits.commits.hours[hour] = (habits.commits.hours[hour] ?? 0) + 1
            //Compute hour with most commits
              habits.commits.hour = hours.length ? `${Object.entries(habits.commits.hours).sort(([an, a], [bn, b]) => b - a).map(([hour, occurence]) => hour)[0]}`.padStart(2, "0") : NaN
          }
        //Indent style
          {
            //Retrieve edited files
              const edited = await Promise.allSettled(commits
                .flatMap(({payload}) => payload.commits).map(commit => commit.url)
                .map(async commit => (await rest.request(commit)).data.files)
              )
            //Attemp to guess whether tabs or spaces are used from patch
              edited
                .filter(({status}) => status === "fulfilled")
                .map(({value}) => value)
                .flatMap(files => files.flatMap(file => (file.patch ?? "").match(/(?<=^[+])((?:\t)|(?:  )) /gm) ?? []))
                .forEach(indent => habits.indents[/^\t/.test(indent) ? "tabs" : "spaces"]++)
            //Compute indent style
              habits.indents.style = habits.indents.spaces > habits.indents.tabs ? "spaces" : habits.indents.tabs > habits.indents.spaces ? "tabs" : ""
          }
        //Results
          return habits
      }
    //Handle errors
      catch (error) {
        console.debug(error)
        throw {error:{message:`An error occured`}}
      }
  }