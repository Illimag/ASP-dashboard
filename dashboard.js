import {getSearch} from 'backend/serviceModule';
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixMembers from 'wix-members';
import wixLocation from 'wix-location';
import {local} from 'wix-storage';
import wixWindow from 'wix-window';

let user = wixUsers.currentUser;
// let user = wixMembers.currentMember;

$w.onReady(async function () {
    let isLoggedIn = user.loggedIn;
    $w('#requests').collapse();
    $w('#emptyRequests').collapse();
    $w('#repeater2').hide();
// user.getRoles()
//   .then((roles) => {
//     console.log(roles);
//   })
//   .catch((error) => {
//     console.error(error);
//   });
    
    if (isLoggedIn) {
            user.getPricingPlans()
                .then((pricingPlans) => {
                   
                    console.log(pricingPlans);
                    if (pricingPlans.length === 0) {
                        $w('#noPlan').show();
                        $w('#box6').collapse();
                        wixWindow.openLightbox("Purchase Plan");
                    }
                    else if (pricingPlans[0].name === 'Fanatic') {
                        $w('#noPlan').show();
                        $w('#text227').collapse();
                        loadEvents();
                    }
                    else if (pricingPlans[0].name !== 'Fanatic') {
                        if(!local.getItem("firstTimePopupShown")) {
                            wixWindow.openLightbox("How To Request Sneakers");
                            local.setItem("firstTimePopupShown", "yes");
                        }
                        
                        $w('#titleInput').expand();
                        loadRequests();
                        loadReservedShoes();
                        loadEvents();
                        
                        $w("#titleInput").onKeyPress((event, $w) => {
                            if (event.key === "Enter") {
                                $w('#errorMessage').hide();
                                let searchText = $w("#titleInput").value;
                                
                                $w('#searchResponse').text = `Searching '${searchText}'...`;
                                $w('#searchResponse').show();
                                searchSneaker(searchText).then(() => {
                                    $w('#searchResponse').hide();
                                    
                                    if (!$w('#errorMessage').isVisible) {
                                        $w('#repeater2').show();
                                    }
                                }) 
                            }
                        });
                    }
                    else {
                        wixWindow.openLightbox("Purchase Plan");
                    }
                });
    }


});

async function searchSneaker(sneaker) {
    console.log("inside search: " + sneaker);
    let shoes = await getSearch(sneaker) ;
    await shoes.results.forEach(result => {
		result._id = String(result.id);
		result.releaseDate ? result.releaseDate = (new Date(result.releaseDate.replace(/-/g, "/"))).toDateString().substring(4) : result.releaseDate = "n/a";
		
	})

    if (shoes.count === 0) {
        $w('#errorMessage').text = `No Results Found for '${sneaker}'`;
        $w('#errorMessage').show();
    } else {
        $w('#repeater2').data = shoes.results;

        $w("#repeater2").onItemReady( ($item, itemData, index) => {
            // $item("#text200").text = itemData.textField;
            $item("#shoeName").text = itemData.title;
            itemData.styleId ? $item("#styleId").text = itemData.styleId : $item("#styleId").text = ""
            
            if (itemData.media.thumbUrl) {
                $item("#shoeImage").src= itemData.media.thumbUrl;
            }
            $item("#releaseDate").text = itemData.releaseDate;

            checkRequest(user.id, itemData.id, $item);
                
        } );
    }
}


async function loadRequests(){
    let wishlistResult = await wixData.query("userWishlist")
        .eq("userId", user.id)
        .find()
    
    if (wishlistResult.length > 0) {
        $w("#requests").expand();
        $w("#emptyRequests").collapse();
        $w("#requests").data = wishlistResult.items;
        $w('#requests').onItemReady(myItemReady);
    }
    else {
        $w("#requests").collapse();
        $w("#emptyRequests").expand();
    }   
}

async function checkRequest(userId, shoeId, $item) {
	if (wixUsers.currentUser.loggedIn) {
        let wishListResult = await wixData.query("userWishlist")
            .eq("shoeId", shoeId)
            .eq("userId", user.id)
            .find();
		
        if(wishListResult.items.length > 0) {
            $item('#requestShoe').disable();
        }
        else {
            $item('#requestShoe').enable();
        }
    }
}

async function myItemReady($w, wishlistItem){	
    $w("#dropdown1").onChange( (event) => {
         let newValue = {
             _id: wishlistItem._id,
             userId: wishlistItem.userId,
             shoeId: wishlistItem.shoeId,
             shoeTitle: wishlistItem.shoeTitle,
             priority: event.target.value,
             userSize: wishlistItem.userSize,
             status: wishlistItem.status,
             statusUpdateDate: wishlistItem.statusUpdateDate
         }; 
         wixData.update("userWishlist", newValue)
            .then(() => {
                loadRequests();
            })
            .catch( (err) => {
                let errorMsg = err;
                console.log(errorMsg);
            } );
    });

    $w("#dropdown2").onChange( (event) => {
         let newValue = {
             _id: wishlistItem._id,
             userId: wishlistItem.userId,
             shoeId: wishlistItem.shoeId,
             shoeTitle: wishlistItem.shoeTitle,
             priority: wishlistItem.priority,
             userSize: event.target.value,
             status: wishlistItem.status,
             statusUpdateDate: wishlistItem.statusUpdateDate
         }; 
         wixData.update("userWishlist", newValue)
            .then(() => {
                loadRequests();
            })
            .catch( (err) => {
                let errorMsg = err;
                console.log(errorMsg);
            } );
    });

	let shoeId = wishlistItem.shoeId;
    let userPriority = wishlistItem.priority;
    let userSize = wishlistItem.userSize;

	if (userPriority) {
        $w("#dropdown1").value = userPriority;
    }

    if (userSize) {
        $w("#dropdown2").value = userSize;
    }

	$w('#resRequestDate').text = wishlistItem._createdDate.toLocaleDateString()
	$w('#resStatus').text = wishlistItem.status;
    if (wishlistItem.statusUpdateDate) {
        $w('#statusUpdateDate').text = wishlistItem.statusUpdateDate.toLocaleString();
    }
    else {
        $w('#statusUpdateDate').text = ""
    }
    
	
	// console.log(new Date(wishlistItem._createdAt));

	let shoeResult = await wixData.query("wishlistShoes")
		.eq("shoeId", shoeId)
		.find();
	
    let shoe = shoeResult.items[0];

    $w('#resImage').src = shoe.url;
    $w('#resName').text = shoe.shoeTitle;
    $w('#resStyle').text = shoe.styleId;
    $w('#resReleaseDate').text = shoe.date;
	
    $w('#deleteItem').onClick(removeItem(wishlistItem._id));

}

function removeItem(id) {
    return async function() {
        await wixData.remove('userWishlist', id);
        loadRequests();
    }
}



export async function requestShoe_click(event) {
    const data = $w("#repeater2").data;
    let $item = $w.at(event.context);

    let shoeData = data.find(item => item._id === event.context.itemId);
    let shoeObj = {
        shoeId: shoeData.id,
		styleId: shoeData.styleId,
		shoeTitle: shoeData.title,
		brand: shoeData.brand,
		url: shoeData.media.imageUrl,
		date: shoeData.releaseDate
    }

    let userWishlistItem = {
		userId: user.id,
		shoeId: shoeData.id,
		shoeTitle: shoeData.title,
        status: 'Request Submitted',
        statusUpdateDate: new Date()
	}

    console.log(shoeObj);

    if (user.loggedIn) {
        let wishListResult = await wixData.query("wishlistShoes")
            .eq("shoeId", shoeData.id)
            .find();
		
        if(wishListResult.items.length > 0) {
            wixData.insert("userWishlist", userWishlistItem).then(response => {
                $item('#requestShoe').disable();
                loadRequests();
            });
			console.log('item exist in wishlistShoes, inserted to userWishlist');
        }
        else {
			wixData.insert("wishlistShoes", shoeObj);
			await wixData.insert("userWishlist", userWishlistItem).then(response => {
                $item('#requestShoe').disable();
                loadRequests();
            })
			console.log('inserted to wishlistShoes, inserted to userWishlist');
        }
    }
}

export function searchIcon_click(event) {
	// This function was added from the Properties & Events panel. To learn more, visit http://wix.to/UcBnC-4
	// Add your code for this event here: 
    $w('#errorMessage').hide();
    let searchText = $w("#titleInput").value;
    
    $w('#searchResponse').text = `Searching '${searchText}'...`;
    $w('#searchResponse').show();
    searchSneaker(searchText).then(() => {
        $w('#searchResponse').hide();
        
        if (!$w('#errorMessage').isVisible) {
            $w('#repeater2').show();
        }
    }) 
}

async function loadReservedShoes(){
    let i = 1;
	let date = new Date();

    let reservedShoe = await wixData.query("reservedShoes")
        .eq("userId", user.id)
		.gt('reservedUntil', date)
        .include('productId')
        .find();

    console.log(reservedShoe);
    if (reservedShoe.items.length > 0) {
        $w("#reserved").expand();
        $w("#emptyReserved").collapse();
        $w("#reserved").data =reservedShoe.items.slice(0,1);
        $w('#reserved').onItemReady(myReservedItemReady);
        $w('#count').text = `1/${reservedShoe.items.length}`;

        if (reservedShoe.items.length <= 1) {
            $w('#nextReserved').hide();
            $w('#prevReserved').hide();
        }

        $w('#prevReserved').onClick(event => {
            let temp = reservedShoe.items.pop();
            reservedShoe.items.unshift(temp);
            $w("#reserved").data = reservedShoe.items.slice(0,1);
             $w('#reserved').onItemReady(myReservedItemReady);
            i = i === 1 ? reservedShoe.items.length : i-1;
            $w('#count').text = `${i}/${reservedShoe.items.length}`;
        })

        $w('#nextReserved').onClick(event => {
            let temp = reservedShoe.items.shift();
            reservedShoe.items.push(temp);
            $w("#reserved").data = reservedShoe.items.slice(0,1);
            $w('#reserved').onItemReady(myReservedItemReady);
            i = i >= reservedShoe.items.length ? 1 : i+1;
            $w('#count').text = `${i}/${reservedShoe.items.length}`;
        })
    }
    else {
        $w("#emptyReserved").expand();
        $w("#reserved").collapse();
    }   
}

async function myReservedItemReady($w, reservedItem) {
		$w('#reservedImage').src = reservedItem.productId.mainMedia;
        $w('#reservedName').text = reservedItem.productId.name;
		$w('#reservedSize').text = "Size: " + reservedItem.size;
        $w('#shoeLink').label = `Buy For ${reservedItem.productId.formattedDiscountedPrice}`;
        $w('#shoeLink').link = "https://www.asneakerheadsparadise.com" + reservedItem.productId.productPageUrl;
		$w('#reservedUntil').text = "Reserved Until: " + reservedItem.reservedUntil.toLocaleDateString();
}

async function loadEvents() {
    let i = 1;
    let date = new Date();
    let events = await wixData.query("Events/Events")
    .eq('status', 'SCHEDULED')
    .find();

    if (events.items.length > 0) {
        $w("#upcomingDrops").expand();
        $w("#emptyUpcomingDrops").collapse();
        $w("#upcomingDrops").data = events.items.slice(0,1);
        $w('#upcomingDrops').onItemReady(myDropItemReady);
        $w('#dropCount').text = `1/${events.items.length}`;

        if (events.items.length <= 1) {
            $w('#nextDrop').hide();
            $w('#prevDrop').hide();
        }

        $w('#prevDrop').onClick(event => {
            let temp = events.items.pop();
            events.items.unshift(temp);
            $w("#upcomingDrops").data = events.items.slice(0,1);
            $w('#upcomingDrops').onItemReady(myDropItemReady);
            i = i === 1 ? events.items.length : i-1;
            $w('#dropCount').text = `${i}/${events.items.length}`;
        })

        $w('#nextDrop').onClick(event => {
            let temp = events.items.shift();
            events.items.push(temp);
            $w("#upcomingDrops").data = events.items.slice(0,1);
            $w('#upcomingDrops').onItemReady(myDropItemReady);
            i = i >= events.items.length ? 1 : i+1;
            $w('#dropCount').text = `${i}/${events.items.length}`;
        })
    }
    else {
        $w("#emptyUpcomingDrops").expand();
        $w("#upcomingDrops").collapse();
    }
}

async function myDropItemReady($w, dropItem) {
		$w('#dropImg').src = dropItem.mainImage;
        $w('#dropName').text = dropItem.title;
        $w('#reserveSlot').link = dropItem.registrationUrl;
		$w('#dropDate').text =  dropItem.scheduleStartDateFormatted;
}


/**
 * _id: "72aee543-8fbb-4846-a366-32ad14af879f"
title: "Jordan 1 Zoom Paris Saint-Germain"
slug: "jordan-1-zoom-paris-saint-germain"
description: "This event is for the online retail release of the Jordan 1 Zoom Paris Saint-Germain. If your slot hits, you will be charged by the retailer. Duplicate checkouts will be canceled unless otherwise stated."
about: "<br>"
created: "Mon Feb 15 2021 19:56:31 GMT-0500 (Eastern Standard Time)"
modified: "Mon Feb 15 2021 19:58:13 GMT-0500 (Eastern Standard Time)"
status: "ENDED"
type: "TICKETS"
registrationStatus: "CLOSED"
googleCalendarUrl: "http://calendar.google.com/calendar/render?action=TEMPLATE&text=Jordan+1+Zoom+Paris+Saint-Germain&dates=20210217T150000Z%2F20210217T190000Z&location=&details=You%27re+registered%21%0AHere+are+the+details%3A%0A%0AJordan+1+Zoom+Paris+Saint-Germain%0AFebruary+17%2C+2021+at+10%3A00+AM+EST%0AVarious+Footsites"
iCalendarUrl: "https://www.wixevents.com/media/calendar/72aee543-8fbb-4846-a366-32ad14af879f?token=JWS.eyJraWQiOiJpb21iOUJ0eSIsImFsZyI6IkhTMjU2In0.eyJkYXRhIjoie1wiZXZlbnRJZFwiOntcInZhbHVlXCI6XCI3MmFlZTU0My04ZmJiLTQ4NDYtYTM2Ni0zMmFkMTRhZjg3OWZcIn0sXCJvY0xpbmtcIjpudWxsfSIsImlhdCI6MTYxNjc3NTY5NH0.Rn5WkwMnM6ABn8JCLDKW3gIXiznJW-lW-cMOvKp6UYo"
userId: "500eda5e-eb28-400a-bec2-9222971cabf0"
scheduleTbd: false
start: "Wed Feb 17 2021 10:00:00 GMT-0500 (Eastern Standard Time)"
end: "Wed Feb 17 2021 14:00:00 GMT-0500 (Eastern Standard Time)"
timeZoneId: "America/New_York"
scheduleFormatted: "February 17, 2021 at 10:00 AM EST"
scheduleStartDateFormatted: "February 17, 2021"
scheduleStartTimeFormatted: "10:00 AM"
locationName: "Various Footsites"
locationAddress: ""
latitude: ""
longitude: ""
mainImage: "image://v1/500eda_e33fc9f5d6584843ba17568f74926c43~mv2.png/1085_581/500eda_e33fc9f5d6584843ba17568f74926c43~mv2.png"
lowestPriceFormatted: "$20.50"
highestPriceFormatted: "$20.50"
siteEventPageUrl: "/event-details/jordan-1-zoom-paris-saint-germain"
registrationUrl: "https://www.aspsneakers.com/event-details/jordan-1-zoom-paris-saint-germain"
 */
