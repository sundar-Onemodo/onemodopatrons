import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Sample images (replace with your actual image sources)
const productImages = {
    1: require('../assets/images/msand.png'),
    2: require('../assets/images/P-Sand.jpeg'),
    3: require('../assets/images/msand.png'),
    4: require('../assets/images/cement.jpg'),
    5: require('../assets/images/msand.png'),
    6: require('../assets/images/P-Sand.jpeg'),
    7: require('../assets/images/cement.jpg'),
    8: require('../assets/images/gravels.jpg'),
    9: require('../assets/images/cement.jpg'),
};

const Dashboard = () => {
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollViewRef = useRef(null);

  // Sample data with image references
  const topSalesData = [
    { id: 1, name: 'M Sand', price: 1200, company: 'BuildCorp', unit: 'per ton', sales: 150, image: productImages[1] },
    { id: 2, name: 'P Sand', price: 1100, company: 'SandTech', unit: 'per ton', sales: 120, image: productImages[2] },
    { id: 3, name: 'Sakkai', price: 800, company: 'StoneWorks', unit: 'per ton', sales: 95, image: productImages[3] },
    { id: 4, name: 'Cement', price: 350, company: 'CementPro', unit: 'per bag', sales: 200, image: productImages[4] },
  ];

  const lowPriceProducts = [
    { id: 5, name: 'M Sand', price: 1000, company: 'EcoSand', unit: 'per ton', discount: 15, image: productImages[5] },
    { id: 6, name: 'P Sand', price: 950, company: 'QuickSand', unit: 'per ton', discount: 20, image: productImages[6] },
    { id: 7, name: 'Sakkai', price: 650, company: 'RockBase', unit: 'per ton', discount: 18, image: productImages[7] },
    { id: 8, name: 'Gravel', price: 450, company: 'GravelMax', unit: 'per ton', discount: 25, image: productImages[8] },
    { id: 9, name: 'Cement', price: 280, company: 'ValueCement', unit: 'per bag', discount: 30, image: productImages[9] },
  ];

  const allProducts = [...topSalesData, ...lowPriceProducts];

  useEffect(() => {
    const filtered = allProducts.filter(product =>
      product.name.toLowerCase().includes(searchText.toLowerCase()) ||
      product.company.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchText]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollingDown = currentScrollY > lastScrollY.current && currentScrollY > 50;
        const scrollingUp = currentScrollY < lastScrollY.current;
        
        if (scrollingDown && isSearchVisible) {
          setIsSearchVisible(false);
        } else if (scrollingUp && !isSearchVisible) {
          setIsSearchVisible(true);
        }
        
        lastScrollY.current = currentScrollY;
      }
    }
  );

  const searchTranslateY = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, -60],
    extrapolate: 'clamp',
  });

  const TopSalesCard = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }, []);

    const scale = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });

    const opacity = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <Animated.View style={[styles.topSalesCard, { 
        transform: [{ scale }],
        opacity
      }]}>
        <ImageBackground source={item.image} style={styles.cardImage} imageStyle={styles.cardImageStyle}>
          <View style={styles.cardOverlay}>
            <View style={styles.cardHeader}>
              <View style={styles.salesBadge}>
                <Text style={styles.salesText}>{item.sales} sold</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.companyName}>{item.company}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{item.price}</Text>
                <Text style={styles.unit}>{item.unit}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.buyButton}>
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </Animated.View>
    );
  };

  const LowPriceCard = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }, []);

    const translateY = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [30, 0],
    });

    const opacity = cardAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });

    return (
      <Animated.View style={[styles.lowPriceCard, { 
        transform: [{ translateY }],
        opacity
      }]}>
        <ImageBackground source={item.image} style={styles.lowPriceImage} imageStyle={styles.lowPriceImageStyle}>
          <View style={styles.lowPriceOverlay}>
            <View style={styles.discountBadgeContainer}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{item.discount}% OFF</Text>
              </View>
            </View>
            <View style={styles.lowPriceContent}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.companyNameLow}>{item.company}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>₹{item.price}</Text>
                <Text style={styles.originalPrice}>₹{Math.round(item.price * (1 + item.discount / 100))}</Text>
              </View>
              <Text style={styles.unitText}>{item.unit}</Text>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    );
  };

  const SectionLabel = ({ title, icon }) => {
    const iconColor = title === 'Top Sales' ? '#FF6B6B' : '#4ECDC4';
    
    return (
      <View style={styles.sectionLabelContainer}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor }]}>
          <Text style={styles.sectionIconText}>{icon}</Text>
        </View>
        <Text style={styles.sectionLabelText}>{title}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Search Bar - Animated */}
      {isSearchVisible && (
        <Animated.View style={[
          styles.searchContainer,
          {
            transform: [{ translateY: searchTranslateY }],
          }
        ]}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products or companies..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      <Animated.ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Sales Section */}
        <View style={styles.section}>
          <SectionLabel title="Top Sales" icon="🔥" />
          <FlatList
            data={topSalesData}
            renderItem={({ item, index }) => <TopSalesCard item={item} index={index} />}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        {/* Low Price Products Section */}
        <View style={styles.section}>
          <SectionLabel title="Best Deals" icon="💰" />
          <View style={styles.gridContainer}>
            {lowPriceProducts.map((item, index) => (
              <LowPriceCard key={item.id} item={item} index={index} />
            ))}
          </View>
        </View>

        {/* Search Results */}
        {searchText.length > 0 && (
          <View style={styles.section}>
            <SectionLabel title="Search Results" icon="🔍" />
            <View style={styles.searchResults}>
              {filteredProducts.length === 0 ? (
                <Text style={styles.noResults}>No products found</Text>
              ) : (
                filteredProducts.map((item, index) => (
                  <View key={item.id} style={styles.searchResultItem}>
                    <Image source={item.image} style={styles.searchResultImage} />
                    <View style={styles.searchResultDetails}>
                      <Text style={styles.searchResultName}>{item.name}</Text>
                      <Text style={styles.searchResultCompany}>{item.company}</Text>
                      <Text style={styles.searchResultPrice}>₹{item.price} {item.unit}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
    fontSize: 18,
    color: '#666',
  },
  clearIcon: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingTop: 70, // Space for search bar
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginHorizontal: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionIconText: {
    fontSize: 16,
    color: '#fff',
  },
  sectionLabelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  topSalesCard: {
    width: width * 0.75,
    height: 220,
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'space-between',
  },
  cardImageStyle: {
    borderRadius: 15,
  },
  cardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  salesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  salesText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  companyName: {
    fontSize: 14,
    color: '#f0f0f0',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 5,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  unit: {
    fontSize: 14,
    color: '#f0f0f0',
    marginLeft: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buyButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  lowPriceCard: {
    width: (width - 40) / 2,
    height: 200,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  lowPriceImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  lowPriceImageStyle: {
    borderRadius: 12,
  },
  lowPriceOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 12,
    justifyContent: 'space-between',
  },
  discountBadgeContainer: {
    alignItems: 'flex-end',
  },
  discountBadge: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lowPriceContent: {
    marginTop: 'auto',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  companyNameLow: {
    fontSize: 12,
    color: '#f0f0f0',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  originalPrice: {
    fontSize: 14,
    color: '#f0f0f0',
    textDecorationLine: 'line-through',
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  unitText: {
    fontSize: 12,
    color: '#f0f0f0',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  searchResults: {
    paddingHorizontal: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  searchResultImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  searchResultDetails: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  searchResultCompany: {
    fontSize: 14,
    color: '#666',
  },
  searchResultPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
    marginTop: 5,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
  },
});

export default Dashboard;