use std::collections::HashMap;
use std::str::FromStr;

use serde::{Deserialize, Serialize};

use crate::core::{
    color::Color,
    image::{Image, PixelChange},
};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub enum ToolId {
    Pen,
    Eraser,
    Fill,
}

impl FromStr for ToolId {
    type Err = &'static str;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "pen" => Ok(Self::Pen),
            "eraser" => Ok(Self::Eraser),
            "fill" => Ok(Self::Fill),
            _ => Err("unknown tool"),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ToolPropertyValue {
    Number(f64),
    Bool(bool),
    String(String),
    Image(Option<Image>),
    Color(Color),
}

#[derive(Clone, Serialize)]
pub struct ToolProperty {
    pub name: String,
    pub value: ToolPropertyValue,
    pub min: f64,
    pub max: f64,
    pub step: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
}

pub trait Tool {
    fn begin_stroke(&mut self) {}
    fn end_stroke(&mut self) {}
    fn apply(
        &mut self,
        image: &mut Image,
        x: f32,
        y: f32,
        color: Color,
        pressure: Option<f32>,
        changes: &mut Vec<PixelChange>,
    );
    fn get_properties(&self) -> Vec<ToolProperty>;
    fn set_property(&mut self, name: &str, value: ToolPropertyValue);
}

#[derive(Default)]
pub struct ToolRegistry {
    tools: HashMap<ToolId, Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&mut self, id: ToolId, tool: Box<dyn Tool>) {
        self.tools.insert(id, tool);
    }

    pub fn get(&self, id: ToolId) -> Option<&dyn Tool> {
        self.tools.get(&id).map(Box::as_ref)
    }

    pub fn get_mut(&mut self, id: ToolId) -> Option<&mut (dyn Tool + '_)> {
        match self.tools.get_mut(&id) {
            Some(tool) => Some(tool.as_mut()),
            None => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ToolId;
    use std::str::FromStr;

    #[test]
    fn parses_supported_tool_ids() {
        assert_eq!(ToolId::from_str("pen"), Ok(ToolId::Pen));
        assert_eq!(ToolId::from_str("eraser"), Ok(ToolId::Eraser));
        assert_eq!(ToolId::from_str("fill"), Ok(ToolId::Fill));
    }

    #[test]
    fn rejects_unknown_tool_ids() {
        assert!(ToolId::from_str("unknown").is_err());
    }
}
