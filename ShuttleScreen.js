import React from 'react';
import { View, Text, Dimensions, StyleSheet, Easing, Animated, FlatList, TouchableOpacity, Image, ActivityIndicator,AppState } from 'react-native';
import { Feather } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get("window").width
const SCREEN_HEIGHT = Dimensions.get("window").height

const currentDate = new Date()
const currentDay = currentDate.getDay()
const currentYear = currentDate.getFullYear()
const currentMonth = currentDate.getMonth()

const iconSize = 20
let currentTime
let closestShuttle = ""

export default class ShuttleScreen extends React.PureComponent {
    constructor(props){
      super(props);

      this.shuttleArr = []
      this.prevExpanded = null
      this.switched = []
      this.isExpand = []
      this.descsArr = []
      this.closestShuttles = [[],[]]

      this.weekdays = []
      this.saturday = []
      this.sunday = []
      this.transfromValue = new Animated.Value(0)

      this.redMarkTimeout = null
		  this.appState = AppState.currentState

      this.transfromPopUp = {
        transform: [
        {
          translateY: this.transfromValue.interpolate({ 
            inputRange: [0,1],
            outputRange: [0,-SCREEN_HEIGHT],
            extrapolate: "clamp"
          })
        }, 
      ]}

      this.state = {
        shuttles : {},
        loading: true,
        change : false, 
        descText: [],
        closest : [[],[]]
      }
    }
    componentDidMount(){
      this.fetchData()
      AppState.addEventListener('change', this._handleAppStateChange);
		  this.updateRedMark(true);
    }  

    componentWillUnmount(){
      if(this.redMarkTimeout !== null){
        clearTimeout(this.redMarkTimeout);
      }
      AppState.removeEventListener('change', this._handleAppStateChange);
    }

    setCurrentTime(){
      const rightNow = new Date()
      const currentHour = rightNow.getHours()
      const currentMinute = rightNow.getMinutes()
      if(currentHour < 5){
        currentTime = new Date(currentYear,currentMonth,currentDay+1,currentHour,currentMinute).getTime()
      }else{
        currentTime = new Date(currentYear,currentMonth,currentDay,currentHour,currentMinute).getTime()
      }
      
    }
    updateRedMark = (shouldRepeat) => {
      const now = new Date();
      if(shouldRepeat === true){
        const timeoutSecond = 61 - now.getSeconds();
        
        this.redMarkTimeout = setTimeout(()=>{
          this.updateRedMark(true);
        }, timeoutSecond * 1000);
      }
      this.closestShuttles[0].length = 0
      this.closestShuttles[1].length = 0
      this.closestShuttle()

    }
    _handleAppStateChange = (nextAppState) => {
      if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
        this.updateRedMark(false);
      }
      this.appState = nextAppState;
    }

    async fetchData(){
      try {
        const shuttleApiCall = await fetch('https://www.sabanciuniv.edu/apps/test/shuttle.php');
        const shuttles = await shuttleApiCall.json();
        this.setState({shuttles: shuttles, loading: false})
      } catch(err) {
        console.log("Error fetching data-----------", err)
      }
        let keys = Object.keys(this.state.shuttles.routes)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]
          this.shuttleArr.push(this.state.shuttles.routes[key])
        }
        this.closestShuttle()
    }

    animatePopUp = (value) => {
      Animated.timing(this.transfromValue, {
          toValue: value,
          duration: 400,
          useNativeDriver: true,
        }).start()
      }

    closestShuttle(){
      let fc = []
      let tc = []
      this.setCurrentTime()
      for(let i = 0; i < this.shuttleArr.length;i++){
        let k = 0
        if(currentDay === 6){
          fc = this.getShuttleHours(this.shuttleArr[i],"saturday").from_camp
          tc = this.getShuttleHours(this.shuttleArr[i],"saturday").to_camp
          
        }else if(currentDay === 0){
          fc = this.getShuttleHours(this.shuttleArr[i],"sunday").from_camp
          tc = this.getShuttleHours(this.shuttleArr[i],"sunday").to_camp
        }else{
          fc = this.getShuttleHours(this.shuttleArr[i],"weekdays").from_camp
          tc = this.getShuttleHours(this.shuttleArr[i],"weekdays").to_camp
        }
        for(;k < fc.length;k++){
          if(currentTime < this.convertToDate(fc[k])){
            break;
          }
        }
        if(fc.length === 0 || fc.length === k){
          this.closestShuttles[0].push("---") 
        }else{
          this.closestShuttles[0].push(fc[k].hour) 
        }
        k = 0
        for(;k < tc.length;k++){
          if(currentTime < this.convertToDate(tc[k])){
            break;
          }
        }
        if(tc.length === 0 || tc.length === k){
          this.closestShuttles[1].push("---") 
        }else{
          this.closestShuttles[1].push(tc[k].hour) 
        }
      }
      this.setState({closest: this.closestShuttles,change: !this.state.change})
    }
    convertToDate(obj){
      let h = obj.hour.slice(0,2)
      let m = obj.hour.slice(3,5)
      let d;

      if(obj.hour < "05:00" ){
        d = new Date(currentYear,currentMonth,currentDay+1,parseInt(h),parseInt(m))
      }else{
        d = new Date(currentYear,currentMonth,currentDay,parseInt(h),parseInt(m))
      }
      let t = d.getTime()
      return t
    }

    compareHours = (a,b) => { 
      let hour1 = a.hour.slice(0,2)
      let min1 = a.hour.slice(3,5)

      let hour2 = b.hour.slice(0,2)
      let min2 = b.hour.slice(3,5)

      let d1,d2;

      if(a.hour < "05:00" ){
        d1 = new Date(currentYear,currentMonth,currentDay+1,parseInt(hour1),parseInt(min1))
      }else{
        d1 = new Date(currentYear,currentMonth,currentDay,parseInt(hour1),parseInt(min1))
      }
      if(b.hour < "05:00" ){
        d2 = new Date(currentYear,currentMonth,currentDay+1,parseInt(hour2),parseInt(min2))
      }else{
        d2 = new Date(currentYear,currentMonth,currentDay,parseInt(hour2),parseInt(min2))
      }
      let firstTime = d1.getTime()
      let secondTime = d2.getTime()

      return firstTime - secondTime
    }

    getShuttleHours(item,day){
      let fromCampus = []
      let toCampus = []
      let keys = []

      if(day == "weekdays"){
        if(item.hours.weekdays.from_campus != undefined){
          keys = Object.keys(item.hours.weekdays.from_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            fromCampus.push(item.hours.weekdays.from_campus[key])
          }  
          fromCampus.sort(this.compareHours)     
        }
        if(item.hours.weekdays.to_campus != undefined){
          keys = Object.keys(item.hours.weekdays.to_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            toCampus.push(item.hours.weekdays.to_campus[key])
          }   
          toCampus.sort(this.compareHours)     
      }
        let obj = {from_camp : fromCampus, to_camp: toCampus}
        return obj

      }else if(day == "saturday"){
        if(item.hours.saturday.from_campus != undefined){
          keys = Object.keys(item.hours.saturday.from_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            fromCampus.push(item.hours.saturday.from_campus[key])
          }        
          fromCampus.sort(this.compareHours)
        }
        if(item.hours.saturday.to_campus != undefined){
          keys = Object.keys(item.hours.saturday.to_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            toCampus.push(item.hours.saturday.to_campus[key])
          } 
          toCampus.sort(this.compareHours)    
      }
        let obj = {from_camp : fromCampus, to_camp: toCampus}
        return obj

      }else if(day == "sunday"){
        if(item.hours.sunday.from_campus != undefined){
          keys = Object.keys(item.hours.sunday.from_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            fromCampus.push(item.hours.sunday.from_campus[key])
          }
          fromCampus.sort(this.compareHours)        
        }
        if(item.hours.sunday.to_campus != undefined){
          keys = Object.keys(item.hours.sunday.to_campus)
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i]
            toCampus.push(item.hours.sunday.to_campus[key])
          }
          toCampus.sort(this.compareHours)        
      }
        let obj = {from_camp : fromCampus,to_camp: toCampus}
        return obj
      }
    }
      changeHeight(index){
        this.isExpand[index] = !this.isExpand[index]
        if(this.prevExpanded === null){
          this.prevExpanded = index
        }else{
          if(this.prevExpanded !== index){
            this.isExpand[this.prevExpanded] = false
            this.prevExpanded = index
          }
        }
        this.setState({change: !this.state.change})
      }
      switchRoutes (index) {
        this.switched[index] = !this.switched[index]
        this.descsArr = []
        this.setState({change: !this.state.change})
      }
      setHour(item,index){
        if(!this.switched[index]){
          this.weekdays = this.getShuttleHours(item,"weekdays").from_camp
          this.saturday = this.getShuttleHours(item,"saturday").from_camp
          this.sunday = this.getShuttleHours(item,"sunday").from_camp
          closestShuttle = this.state.closest[0][index]
        }else{
          this.weekdays = this.getShuttleHours(item,"weekdays").to_camp
          this.saturday = this.getShuttleHours(item,"saturday").to_camp
          this.sunday = this.getShuttleHours(item,"sunday").to_camp
          closestShuttle = this.state.closest[1][index]
        }
        let obj = {w: this.weekdays, sat: this.saturday, sun: this.sunday}
        this.descsArr.push(obj)
      }
      descPressed(index,day){
        if(day === "weekdays"){
          this.setState({descText: this.descsArr[this.prevExpanded].w[index].descs},()=>{this.animatePopUp(1)})
        }else if(day === "saturday"){
          this.setState({descText: this.descsArr[this.prevExpanded].sat[index].descs},()=>{this.animatePopUp(1)})
        }else{
          this.setState({descText: this.descsArr[this.prevExpanded].sun[index].descs },()=>{this.animatePopUp(1)})
        }
      }
      renderItem({item,index}){
        this.switched.push(false)
        this.setHour(item,index)
        this.isExpand.push(false)
        return(
          <View style={{paddingVertical:SCREEN_WIDTH*0.03}}>
            <TouchableOpacity onPress={()=>this.changeHeight(index)} activeOpacity={0.8}>
              <View style={styles.shuttleRow}>
                <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
                  <Feather name={"home"} size={iconSize} />
                  <Text style={{marginTop:5}}>
                    {this.state.closest[0][index]}   
                  </Text>
                </View>
                <View style={{flex:2,alignItems:"center",paddingVertical:10}}>
                  <Text style={{fontWeight:"400",fontSize:16}}>
                    {item.ROUTE_NAME_TR}
                  </Text>
                  <View style={{flexDirection:"row",alignItems:"center"}}>
                    <View style={styles.circle}/>
                    <View style={styles.dashedSeperator}/>
                    <View style={styles.circle}/>
                  </View>
                  <Text style={{fontSize:12,color:"rgba(101, 109, 120, .8)"}}>
                    Upcoming hours
                  </Text>
                </View>
                <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
                  <Feather name={"map"} size={iconSize} />
                  <Text style={{marginTop:5}}>
                    {this.state.closest[1][index]}  
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            <View style={{height: this.isExpand[index] === true ? null : 0, overflow:"hidden"}} > 
              <View style={styles.grayView}>
                  <Text>
                    {!this.switched[index] ? "Campus > " + item.ROUTE_NAME_TR : item.ROUTE_NAME_TR + " > Campus"}
                  </Text>
                  <View style={{flexDirection:"row"}}>
                    <Feather name={"map-pin"} size={18} style={{marginRight:10}}/>
                    <TouchableOpacity onPress={()=>this.switchRoutes(index)}>
                      <Feather name={"repeat"} size={18}/>
                    </TouchableOpacity>
                  </View>
              </View>
              <View style={styles.shuttleHoursContainer}  >
                <View style={styles.dayColumn}>
                  <Text style={{fontSize:15,marginBottom:5}}>
                    {item.hours.weekdays.DAY_TEXT.toUpperCase()}
                  </Text>
                  {this.weekdays.map((item,index)  => {
                    return(
                      <View style={{flexDirection:"row",alignItems:"center"}} key = {"a" + index}>
                        <Text style={{marginVertical:5,marginRight:3 ,color: (closestShuttle == item.hour && currentDay !== 6 && currentDay !== 0 ) ? 'rgba(93, 156, 236, 1.0)' : "black"}}>
                        {item.hour}
                        </Text>
                        <TouchableOpacity style={{flexDirection:"row"}} onPress={()=>this.descPressed(index,"weekdays")}>
                          {item.descs.map((item,index) => {
                            return(
                                <Text style={{fontSize:10,fontWeight:"300"}} key={"text"+ index}>
                                  {"(" + item.DESC_NUMBER + ")"}
                                </Text>
                              )
                          })}
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
                <View style={styles.verticalSeperator}/>
                <View style={styles.dayColumn}>
                  <Text style={{fontSize:15,marginBottom:5}}>
                    {item.hours.saturday.DAY_TEXT.toUpperCase()}
                  </Text>
                  {this.saturday.map((item,index) => {
                    return(
                      <View style={{flexDirection:"row",alignItems:"center"}} key={"o" + index}>
                        <Text style={{marginVertical:5,marginRight:3 ,color: (closestShuttle === item.hour && currentDay === 6 ) ? 'rgba(93, 156, 236, 1.0)' : "black"}}>
                          {item.hour}
                        </Text>
                        <TouchableOpacity style={{flexDirection:"row"}} onPress={()=>this.descPressed(index,"saturday")}>
                          {item.descs.map((item,index) => {
                            return(
                              <View key={"c" + index}>  
                                <Text style={{fontSize:10,fontWeight:"300"}}>
                                  {"(" + item.DESC_NUMBER + ")"}
                                </Text>
                              </View>
                            )
                          })}
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
                <View style={styles.verticalSeperator}/>
                <View style={styles.dayColumn}>
                  <Text style={{fontSize:15,marginBottom:5}}>
                    {item.hours.sunday.DAY_TEXT.toUpperCase()}
                  </Text>
                    {this.sunday.map((item,index) => {
                      return(
                        <View style={{flexDirection:"row",alignItems:"center"}} key={"sunday" + index}>
                          <Text style={{marginVertical:5,marginRight:3 ,color: (closestShuttle === item.hour && currentDay === 0 ) ? 'rgba(93, 156, 236, 1.0)' : "black"}}>
                            {item.hour}
                          </Text>
                          <TouchableOpacity style={{flexDirection:"row"}} onPress={()=> this.descPressed(index,"sunday")}>
                            {item.descs.map((item,index) => {
                              return(
                                <Text style={{fontSize:10,fontWeight:"300"}} key={"desc" + index}>
                                  {"(" + item.DESC_NUMBER + ")"}
                                </Text>
                              )
                            })}
                          </TouchableOpacity>
                        </View>
                      )
                    })}
                </View>
              </View>
            </View>
          </View>
        )
      }

    render(){
      if(!this.state.loading){
        return(
          <View style = {styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerText}>
                Shuttle
              </Text>
              <Feather name={"search"} size={iconSize} style={{marginRight:SCREEN_WIDTH*0.05}}/>
            </View>
            <FlatList
              data={this.shuttleArr}
              style={styles.list}
              contentContainerStyle={{alignItems:"center",padding:10}}
              keyExtractor={(item, index) => item + index + "shuttles"}
              renderItem = {(item) => this.renderItem(item)}
              />
            <Animated.View style={[styles.p,this.transfromPopUp]}>
              <View style={[styles.popUp]}>
                <TouchableOpacity style={{height:30,width:30,alignSelf:"flex-end"}} onPress ={()=>this.animatePopUp(0)}>
                  <Feather name={"x"} size={iconSize}/>
                </TouchableOpacity>
                {this.state.descText.map((item,index)=>{
                  return(
                    <Text style={{marginTop:10}} key={"d" + index}>
                      {"(" + item.DESC_NUMBER + ")" + ": " + item.DESC_TEXT}
                    </Text>
                  )
                })}
              </View>
            </Animated.View>  
          </View>
        )
      }else{
        return (<ActivityIndicator style={{flex:1}}/>)
      }
    }
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
      width: SCREEN_WIDTH,
  },
  shuttleRow:{
    width:SCREEN_WIDTH*0.9,
    height:SCREEN_WIDTH*0.2,
    backgroundColor:"white",
    borderRadius:5,
    flexDirection:"row",
  },
  list:{
    flex: 1, 
    width :SCREEN_WIDTH,
    backgroundColor:'rgba(233,233,233, .7)',
  },
  headerText:{
    fontSize:20,
    marginLeft:SCREEN_WIDTH*0.05,
    fontWeight:"300",
    marginTop:10
  },
  header:{
    width:SCREEN_WIDTH,
    height:SCREEN_WIDTH*0.25,
    alignItems:"center",
    flexDirection:"row",
    justifyContent:"space-between"
  },
  verticalSeperator:{
    height:"80%",
    width:0.2,
    backgroundColor:"black",
    alignSelf:"center"
  },
  circle:{
    height:8,
    width:8,
    borderRadius:4,
    backgroundColor:'rgba(101, 109, 120, .2)'
  },
  dashedSeperator:{
    width:"100%",
    borderWidth:1,
    marginTop:7,
    borderStyle:"dashed",
    marginBottom:7,
    borderColor:'rgba(101, 109, 120, .2)'
  },
  grayView:{
    width:SCREEN_WIDTH*0.9,
    height:SCREEN_WIDTH*0.1,
    backgroundColor:'rgba(101, 109, 120, .2)',
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    paddingHorizontal:15
  },
  shuttleHoursContainer:{
    width:SCREEN_WIDTH*0.9,
    backgroundColor:"white",
    borderBottomEndRadius:3,
    borderBottomStartRadius:3,
    flexDirection:"row"
  },
  dayColumn:{
    flex:1,
    alignItems:"center",
    paddingVertical:15
  },
  popUp:{
    position:"absolute",
    borderRadius:10,
    height:SCREEN_WIDTH * 0.6,
    width:SCREEN_WIDTH,
    backgroundColor:"white",
    padding:20
  },
  p:{
    position:"absolute",
    width:SCREEN_WIDTH,
    height:SCREEN_HEIGHT,
    backgroundColor:'rgba(101, 109, 120, .8)',
    top:SCREEN_HEIGHT,
    justifyContent:"flex-end"
  }

  });

