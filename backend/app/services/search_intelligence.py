"""
Advanced search intelligence service with semantic search, fuzzy matching, and query expansion.
"""

import re
from typing import List, Dict, Set, Tuple, Optional
from difflib import SequenceMatcher
from collections import defaultdict

class SearchIntelligence:
    def __init__(self):
        # Country to cuisine mappings
        self.country_cuisine_map = {
            # Europe
            "italy": ["italian"],
            "italian": ["italian"],
            "france": ["french"],
            "french": ["french"],
            "spain": ["spanish", "mediterranean"],
            "spanish": ["spanish", "mediterranean"],
            "greece": ["greek", "mediterranean"],
            "greek": ["greek", "mediterranean"],
            "germany": ["german", "european"],
            "german": ["german", "european"],
            "britain": ["british", "pub", "fish and chips"],
            "british": ["british", "pub", "fish and chips"],
            "england": ["british", "pub", "fish and chips"],
            "uk": ["british", "pub", "fish and chips"],

            # Asia
            "china": ["chinese", "asian"],
            "chinese": ["chinese", "asian"],
            "japan": ["japanese", "asian", "sushi"],
            "japanese": ["japanese", "asian", "sushi"],
            "korea": ["korean", "asian"],
            "korean": ["korean", "asian"],
            "thailand": ["thai", "asian"],
            "thai": ["thai", "asian"],
            "vietnam": ["vietnamese", "asian"],
            "vietnamese": ["vietnamese", "asian"],
            "india": ["indian", "asian"],
            "indian": ["indian", "asian"],

            # Americas
            "mexico": ["mexican", "latin"],
            "mexican": ["mexican", "latin"],
            "america": ["american"],
            "american": ["american"],
            "usa": ["american"],
            "brazil": ["brazilian", "latin"],
            "brazilian": ["brazilian", "latin"],
            "peru": ["peruvian", "latin"],
            "peruvian": ["peruvian", "latin"],

            # Middle East & Africa
            "lebanon": ["lebanese", "middle eastern"],
            "lebanese": ["lebanese", "middle eastern"],
            "turkey": ["turkish", "middle eastern"],
            "turkish": ["turkish", "middle eastern"],
            "morocco": ["moroccan", "middle eastern"],
            "moroccan": ["moroccan", "middle eastern"],
            "ethiopia": ["ethiopian", "african"],
            "ethiopian": ["ethiopian", "african"],
        }

        # Synonym mappings for common search terms
        self.synonym_map = {
            # Flavor descriptors
            "spicy": ["hot", "fiery", "peppery", "chili", "jalapeño"],
            "hot": ["spicy", "fiery", "peppery", "chili"],
            "mild": ["light", "gentle", "subtle"],
            "sweet": ["dessert", "candy", "sugar"],
            "sour": ["tart", "tangy", "acidic"],
            "healthy": ["low-calorie", "light", "fresh", "clean", "nutritious"],
            "fresh": ["light", "clean", "healthy", "raw"],
            "comfort": ["hearty", "filling", "homestyle", "cozy"],
            "gourmet": ["upscale", "fine dining", "fancy", "high-end"],
            "cheap": ["affordable", "budget", "inexpensive", "value"],
            "expensive": ["pricey", "upscale", "fine dining", "premium"],

            # Food types
            "pizza": ["pie", "italian"],
            "burger": ["american", "fast food", "sandwich"],
            "sandwich": ["sub", "hoagie", "deli"],
            "pasta": ["italian", "noodles"],
            "noodles": ["pasta", "asian"],
            "soup": ["broth", "bisque", "stew"],
            "salad": ["healthy", "fresh", "greens"],
            "bbq": ["barbecue", "grilled", "smoked"],
            "barbecue": ["bbq", "grilled", "smoked"],
            "fried": ["crispy", "crunchy"],
            "grilled": ["bbq", "barbecue", "charred"],
            "vegetarian": ["veggie", "plant-based", "veg"],
            "vegan": ["plant-based", "dairy-free"],

            # Meal times
            "breakfast": ["brunch", "morning"],
            "brunch": ["breakfast", "morning"],
            "lunch": ["midday"],
            "dinner": ["evening", "supper"],
            "late night": ["after hours", "24 hour"],

            # Restaurant types
            "cafe": ["coffee", "bistro"],
            "coffee": ["cafe", "espresso"],
            "bar": ["pub", "tavern", "brewery"],
            "pub": ["bar", "tavern"],
            "diner": ["cafe", "american"],
            "buffet": ["all you can eat", "self-serve"],
            "food truck": ["mobile", "street food"],
            "takeout": ["delivery", "to-go"],
            "fast food": ["quick service", "drive-through"],
        }

        # Common typos and abbreviations
        self.typo_corrections = {
            # Common misspellings
            "resturant": "restaurant",
            "restraunt": "restaurant",
            "restaraunt": "restaurant",
            "restrant": "restaurant",
            "itallian": "italian",
            "chinease": "chinese",
            "mexcan": "mexican",
            "japenese": "japanese",
            "restraunt": "restaurant",

            # Abbreviations
            "mex": "mexican",
            "ital": "italian",
            "jap": "japanese",
            "amer": "american",
            "med": "mediterranean",
            "bbq": "barbecue",
            "veggie": "vegetarian",
            "bfast": "breakfast",

            # Plurals to singular
            "pizzas": "pizza",
            "burgers": "burger",
            "tacos": "taco",
            "sandwiches": "sandwich",
        }

    def normalize_query(self, query: str) -> str:
        """Normalize search query by cleaning and standardizing."""
        if not query:
            return ""

        # Convert to lowercase and strip
        query = query.lower().strip()

        # Remove extra whitespace
        query = re.sub(r'\s+', ' ', query)

        # Remove special characters except hyphens and apostrophes
        query = re.sub(r"[^\w\s\-']", "", query)

        return query

    def expand_query(self, query: str) -> List[str]:
        """Expand query with semantic variations and synonyms."""
        normalized = self.normalize_query(query)
        expanded_terms = set([normalized])

        # Split into words for individual processing
        words = normalized.split()

        for word in words:
            # Check typo corrections
            if word in self.typo_corrections:
                corrected = self.typo_corrections[word]
                expanded_terms.add(corrected)
                # Also expand the corrected term
                expanded_terms.update(self._expand_single_term(corrected))

            # Expand each word
            expanded_terms.update(self._expand_single_term(word))

        return list(expanded_terms)

    def _expand_single_term(self, term: str) -> Set[str]:
        """Expand a single term with all possible variations."""
        expansions = set()

        # Country to cuisine mapping
        if term in self.country_cuisine_map:
            expansions.update(self.country_cuisine_map[term])

        # Synonym mapping
        if term in self.synonym_map:
            expansions.update(self.synonym_map[term])

        # Reverse synonym lookup (if term is a synonym of something)
        for key, synonyms in self.synonym_map.items():
            if term in synonyms:
                expansions.add(key)
                expansions.update(synonyms)

        return expansions

    def fuzzy_match(self, query: str, target: str, threshold: float = 0.6) -> bool:
        """Check if query fuzzy matches target with given threshold."""
        if not query or not target:
            return False

        # Exact match
        if query in target.lower():
            return True

        # Fuzzy matching using sequence matcher
        ratio = SequenceMatcher(None, query.lower(), target.lower()).ratio()
        return ratio >= threshold

    def suggest_corrections(self, query: str, available_terms: List[str]) -> List[str]:
        """Suggest spelling corrections based on available terms."""
        normalized = self.normalize_query(query)
        suggestions = []

        # Check direct typo corrections first
        for word in normalized.split():
            if word in self.typo_corrections:
                suggestions.append(self.typo_corrections[word])

        # Find fuzzy matches in available terms
        for term in available_terms:
            if self.fuzzy_match(normalized, term, threshold=0.7):
                suggestions.append(term)

        # Remove duplicates while preserving order
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            if suggestion not in seen:
                seen.add(suggestion)
                unique_suggestions.append(suggestion)

        return unique_suggestions[:5]  # Limit to top 5 suggestions

    def get_search_suggestions(self, partial_query: str, available_cuisines: List[str]) -> List[str]:
        """Get auto-complete suggestions for partial queries."""
        if not partial_query or len(partial_query) < 2:
            return []

        normalized = self.normalize_query(partial_query)
        suggestions = set()

        # Direct matches in available cuisines
        for cuisine in available_cuisines:
            if cuisine.lower().startswith(normalized):
                suggestions.add(cuisine)

        # Expanded term matches
        expanded_terms = self.expand_query(partial_query)
        for term in expanded_terms:
            for cuisine in available_cuisines:
                if cuisine.lower().startswith(term.lower()):
                    suggestions.add(cuisine)

        # Popular search patterns based on partial input
        if len(normalized) >= 2:
            for country, cuisines in self.country_cuisine_map.items():
                if country.startswith(normalized):
                    suggestions.update(cuisines)

        # Filter to only include available cuisines
        valid_suggestions = [s for s in suggestions if s.lower() in [c.lower() for c in available_cuisines]]

        return sorted(valid_suggestions)[:8]  # Limit to 8 suggestions

    def analyze_search_intent(self, query: str) -> Dict[str, any]:
        """Analyze search query to understand user intent."""
        normalized = self.normalize_query(query)
        words = normalized.split()

        analysis = {
            "original_query": query,
            "normalized_query": normalized,
            "expanded_terms": self.expand_query(query),
            "intent_signals": [],
            "filters": {
                "cuisine_types": [],
                "price_signals": [],
                "dietary_restrictions": [],
                "meal_time": None,
                "restaurant_type": None
            }
        }

        # Analyze for different intent signals
        for word in words:
            # Price signals
            if word in ["cheap", "affordable", "budget", "expensive", "upscale", "fine"]:
                analysis["intent_signals"].append("price_sensitive")
                analysis["filters"]["price_signals"].append(word)

            # Dietary restrictions
            if word in ["vegetarian", "vegan", "gluten-free", "healthy"]:
                analysis["intent_signals"].append("dietary_restriction")
                analysis["filters"]["dietary_restrictions"].append(word)

            # Meal time
            if word in ["breakfast", "brunch", "lunch", "dinner", "late night"]:
                analysis["intent_signals"].append("time_based")
                analysis["filters"]["meal_time"] = word

            # Restaurant type
            if word in ["cafe", "bar", "pub", "diner", "buffet", "food truck"]:
                analysis["intent_signals"].append("venue_type")
                analysis["filters"]["restaurant_type"] = word

        # Map to cuisine types
        for term in analysis["expanded_terms"]:
            # Check if it's a known cuisine
            available_cuisines = [
                "American", "Italian", "Chinese", "Mexican", "Japanese", "Thai",
                "Indian", "French", "Pizza", "Cafe", "Mediterranean", "Korean",
                "Vietnamese", "Greek", "Spanish", "German", "British"
            ]

            for cuisine in available_cuisines:
                if term.lower() == cuisine.lower():
                    analysis["filters"]["cuisine_types"].append(cuisine)

        return analysis

# Global instance
search_intelligence = SearchIntelligence()