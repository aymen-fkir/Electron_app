function addemails(emails){
    const list = document.getElementById("list");
    const place = document.getElementById("inside_element");
    emails.map((email)=>{
        const item = document.createElement("li");    
        item.className = "items"
        item.id = email.Id+"_"+email.To;
        const subject = document.createElement("span")
        subject.className = "subject"
        subject.textContent = email.Subject
        const tag = document.createElement("span")
        tag.className = "tag"
        tag.textContent = email.Tag
        
        item.append(subject)
        item.append(tag)
        item.addEventListener("click",()=>{
            place.innerHTML = ""
            place.innerText = ""
            const data = email["Data"][0]
            console.log(data)
            if (data["text/html"].lenght !=0)
            {
                place.innerHTML = data["text/html"][0];
            }else if(data["text/plain"].lenght !=0){
                place.innerText = data["text/plain"][0]
            }
        })
        list.append(item)
        

    })
    
    document.dispatchEvent(new Event('rowsAdded'));
}
async function getemails(){
    var emails = await window.gettingemails.relode()
    emails.map((email)=>addemails(email))    
}




getemails()



